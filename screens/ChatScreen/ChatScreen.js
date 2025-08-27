import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Image,
  Modal,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { format } from 'date-fns';
import supabase from '../../services/supabaseConfig';
import { 
  getMessages, 
  sendMessage, 
  markMessagesAsRead, 
  subscribeToMessages,
  findOrCreateConversation,
  ERROR_CODES,
  triggerConversationsRefresh,
} from '../../services/messageService';
import { blockUser, unblockUser, isUserBlocked as checkIfUserBlocked } from '../../services/blockingService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UnreadContext } from '../../context/UnreadContext';
import ErrorBoundaryWrapper from '../../components/ErrorBoundary/ErrorBoundaryWrapper';
import { handleChatError } from '../../utils/chatErrorHandler';
import { checkNetworkConnection } from '../../utils/networkUtils';
import { useFocusEffect } from '@react-navigation/native';
import { EventRegister } from 'react-native-event-listeners';

// Helper function to safely parse read_by field
const parseReadBy = (readBy) => {
  if (Array.isArray(readBy)) return readBy;
  if (typeof readBy === 'string') {
    try {
      return JSON.parse(readBy || '[]');
    } catch (e) {
      return [];
    }
  }
  return [];
};

// Update the logging utility at the top
const logEvent = (eventName, data) => {
};

const ChatScreen = ({ route }) => {
  const { conversationId: initialConversationId, otherUserId, otherUserName, productInfo: routeProductInfo } = route.params || {};
  const [productInfo, setProductInfo] = useState(routeProductInfo);
  
  // Only log if product info is missing
  if (!routeProductInfo) {

  }
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { getThemeColors } = useTheme();
  const colors = getThemeColors();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [otherUserProfile, setOtherUserProfile] = useState(null);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [error, setError] = useState(null);
  const { refreshUnreadCount } = useContext(UnreadContext);
  const [avatarSource, setAvatarSource] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [isUserBlocked, setIsUserBlocked] = useState(false);

  const flatListRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Add a component mount reference to ensure we properly handle the lifecycle
  const isMounted = useRef(true);

  // Update the navigation useEffect with product-centric header
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: '',  // Clear the title to make room for our custom header
      headerLeft: () => (
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            {/* Other User Avatar */}
            <View style={styles.headerUserAvatarWrapper}>
              {otherUserProfile?.is_deleted ? (
                <Image
                  source={require('../../assets/deleted_user_placeholder.png')}
                  style={styles.headerUserAvatar}
                />
              ) : otherUserProfile?.avatar_url ? (
                <Image
                  source={{ 
                    uri: getAvatarUrl(otherUserProfile.avatar_url),
                    cache: 'force-cache'
                  }}
                  style={styles.headerUserAvatar}
                  defaultSource={require('../../assets/default-avatar.png')}
                />
              ) : (
                <View style={[styles.headerUserAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.headerUserAvatarText, { color: colors.headerText }]}>
                    {otherUserProfile?.username?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Other User Info */}
            <View style={styles.headerUserInfo}>
              <Text style={[styles.headerTitle, { color: colors.headerText }]} numberOfLines={1}>
                {otherUserProfile?.is_deleted ? t('deletedAccount') : (otherUserProfile?.username || t('unknownUser'))}
              </Text>
            </View>
          </View>
        </View>
      ),
      headerStyle: {
        backgroundColor: colors.headerBackground,
        elevation: 2,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
      },
    });
  }, [navigation, otherUserProfile, productInfo, currentUser, t, colors]);

  // Get current user ID and profile
  useEffect(() => {
    const getCurrentUserId = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setCurrentUserId(data.user.id);
          
          // Also fetch the user's profile for avatar
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', data.user.id)
            .single();
            
          if (profileData) {
            setCurrentUser({
              ...data.user,
              profile: profileData
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    getCurrentUserId();
  }, []);

  // Fetch other user's profile for avatar and check blocking status
  useEffect(() => {
    const fetchOtherUserProfile = async () => {
      // Handle deleted users (otherUserId is null)
      if (!otherUserId) {
        setOtherUserProfile({
          username: t('deletedAccount'),
          avatar_url: 'deleted_user_placeholder.png',
          is_deleted: true
        });
        setIsUserBlocked(false); // Deleted users can't be blocked
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url, dorm')
          .eq('id', otherUserId)
          .single();

        if (error) {
          console.error('Error fetching other user profile:', error);
          // If profile not found, treat as deleted user
          setOtherUserProfile({
            username: t('deletedAccount'),
            avatar_url: 'deleted_user_placeholder.png',
            is_deleted: true
          });
          setIsUserBlocked(false);
          return;
        }

        setOtherUserProfile(data);
        // Set avatar source if available
        if (data?.avatar_url) {
          setAvatarSource({ uri: data.avatar_url });
        }

        // Check if user is blocked
        const blockedStatus = await checkIfUserBlocked(otherUserId);
        setIsUserBlocked(blockedStatus);
      } catch (error) {
        console.error('Error in fetchOtherUserProfile:', error);
        // Treat as deleted user on error
        setOtherUserProfile({
          username: t('deletedAccount'),
          avatar_url: 'deleted_user_placeholder.png',
          is_deleted: true
        });
        setIsUserBlocked(false);
      }
    };

    fetchOtherUserProfile();
  }, [otherUserId]);

  // In your ChatScreen component where you navigate
  useEffect(() => {
    // Update navigation params when user info changes
    navigation.setParams({
      otherUserName: otherUserProfile?.username || t('chat'),
      otherUserAvatar: getAvatarUrl(otherUserProfile?.avatar_url),
      sellerId: otherUserProfile?.id,
      productId: route.params?.productId // If you have this
    });
  }, [navigation, otherUserProfile]);

  // Add this helper function in your ChatScreen
  const getAvatarUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    try {
      const publicUrl = supabase.storage
        .from('avatars')
        .getPublicUrl(url);
      return publicUrl?.data?.publicUrl || null;
    } catch (error) {
      console.error('Error getting avatar URL:', error);
      return null;
    }
  };

  // Fetch product info from conversation
  const fetchProductInfoFromConversation = useCallback(async (conversationId) => {
    if (!conversationId) {

      return;
    }
    
    try {

      
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select(`
          product_id,
          product_name,
          product_image,
          product_type,
          product_price,
          product_dorm,
          product_deleted
        `)
        .eq('conversation_id', conversationId)
        .single();
      
      if (error) {
        console.error('Error fetching conversation product info:', error);
        return;
      }
      
      if (conversation && conversation.product_id) {

      } else {

      }
      
      if (conversation && conversation.product_id) {
        
        // Check if product is deleted (handle missing column gracefully)
        const isProductDeleted = (conversation.product_deleted !== undefined ? conversation.product_deleted : false);
        
        // Generate product image URL (only if product is not deleted)
        let productImageUrl = null;
        if (!isProductDeleted && conversation.product_image) {
          if (conversation.product_image.startsWith('http')) {
            productImageUrl = conversation.product_image.split('?')[0]; // Remove cache params
          } else {
            const bucket = conversation.product_type === 'buy_order' ? 'buy-orders-images' : 'product_images';
            try {
              const publicUrl = supabase.storage.from(bucket).getPublicUrl(conversation.product_image);
              productImageUrl = publicUrl?.data?.publicUrl || null;
            } catch (error) {
              console.error('Error generating product image URL:', error);
            }
          }
        }
        
        const productData = {
          id: conversation.product_id,
          name: isProductDeleted ? t('deletedProduct') : (conversation.product_name || t('unknownProduct')),
          mainImage: productImageUrl,
          type: conversation.product_type,
          price: conversation.product_price,
          dorm: conversation.product_dorm,
          is_deleted: isProductDeleted
        };
        

        setProductInfo(productData);
      } else {

      }
    } catch (error) {
      console.error('Error in fetchProductInfoFromConversation:', error);
    }
  }, []);

  // Initialize conversation
  const initializeConversation = useCallback(async () => {
    if (!currentUserId) return;
    
    // Allow null otherUserId for deleted users
    if (!otherUserId && !conversationId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        throw new Error('network');
      }

      if (conversationId) {
        // Existing conversation - fetch messages and product info
        await fetchMessages();
        if (!productInfo) {
          await fetchProductInfoFromConversation(conversationId);
        }
      } else {
        // New conversation - just clean up any stuck messages
        await cleanupStuckMessages();
        // Don't create conversation yet - wait for first message
        setConversationId(null);
      }
    } catch (error) {
      setError(error);
      const errorType = error.message === 'network' ? 'NETWORK' : 'INIT_CHAT';
      handleChatError(error, t, errorType);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, otherUserId, conversationId, navigation, fetchMessages, cleanupStuckMessages, t, productInfo, fetchProductInfoFromConversation]);

  // Update the useEffect to use the new function
  useEffect(() => {
    if (currentUserId) {
      initializeConversation();
    }
  }, [currentUserId, initializeConversation]);

  // Fetch product info when conversationId changes
  useEffect(() => {
    if (conversationId && !productInfo) {

      fetchProductInfoFromConversation(conversationId);
    }
  }, [conversationId, productInfo, fetchProductInfoFromConversation]);

  // Function to clean up stuck messages
  const cleanupStuckMessages = async () => {
    try {
      if (!currentUserId) return;
      
      // For deleted users, we don't need to clean up temp messages
      if (!otherUserId) return;
      
      // Generate the conversation ID
      const potentialConversationId = [currentUserId, otherUserId].sort().join('_');
      
      // Create the AsyncStorage key for temp messages
      const tempMessagesKey = `temp_messages_${potentialConversationId}`;
      
      // Check if there are any stuck messages for this conversation
      const existingTempMessagesJson = await AsyncStorage.getItem(tempMessagesKey);
      
      if (existingTempMessagesJson) {
        // Remove the stuck messages
        await AsyncStorage.removeItem(tempMessagesKey);
      }
    } catch (error) {
      console.error('Error cleaning up stuck messages:', error);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: false });
    }
  }, [messages]);

  // Function to remove duplicate messages
  const deduplicateMessages = useCallback((messagesList) => {
    const seen = new Map();
    return messagesList.filter(message => {
      const key = `${message.id}-${message.content}`;
      if (seen.has(key)) return false;
      seen.set(key, true);
      return true;
    }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, []);

  // Handle sending a message
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || !currentUserId || sending) return;
    
    // Don't allow sending messages to deleted users
    if (!otherUserId) {
      Alert.alert(
        t('error'),
        t('cannotSendToDeletedUser'),
        [{ text: t('ok'), style: 'default' }]
      );
      return;
    }
    
    setSending(true);
    const messageText = inputText.trim();
    setInputText('');
    
    try {
      // If no conversation exists yet, create it
      let targetConversationId = conversationId;
      
      if (!targetConversationId) {

        
        if (!productInfo) {
          throw new Error('Product info required to create conversation');
        }
        
        const conversation = await findOrCreateConversation(productInfo, otherUserId);
        targetConversationId = conversation.conversation_id;
        setConversationId(targetConversationId);
        navigation.setParams({ conversationId: targetConversationId });
        

      }
      
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      
            const tempMessage = {
        id: tempId,
        conversation_id: targetConversationId,
        sender_id: currentUserId,
        content: messageText,
        created_at: new Date().toISOString(),
        isTemp: true
      };
      
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        throw new Error('network');
      }

      // Add temp message
      setMessages(prev => {
        const withoutTemp = prev.filter(msg => 
          !msg.isTemp && msg.id !== tempId
        );
        return deduplicateMessages([...withoutTemp, tempMessage]);
      });

      // Send the actual message
      const sentMessage = await sendMessage(targetConversationId, messageText);
      
      // Replace temp message with real one
      setMessages(prev => {
        const withoutTemp = prev.filter(msg => 
          msg.id !== tempId && !msg.isTemp
        );
        return deduplicateMessages([...withoutTemp, sentMessage]);
      });
      
      // Trigger conversations refresh after creating new conversation
      if (!conversationId) {
        setTimeout(() => {
          triggerConversationsRefresh();
        }, 1000);
      }
      
          } catch (error) {
        if (error.message === 'USER_BLOCKED_YOU') {
          Alert.alert(
            t('blockedUserTitle'),
            t('blockedUserMessage'),
            [{ text: t('ok'), style: 'default' }]
          );
        } else if (error.message === 'YOU_BLOCKED_USER') {
          Alert.alert(
            t('blockedUserTitle2'),
            t('blockedUserMessage2'),
            [{ text: t('ok'), style: 'default' }]
          );
        } else if (error.message === 'BLOCKED_USER') {
          Alert.alert(
            t('blockedUserTitle'),
            t('blockedUserMessage'),
            [{ text: t('ok'), style: 'default' }]
          );
        } else {
          setError(error);
          const errorType = error.message === 'network' ? 'NETWORK' : 'SEND_MESSAGE';
          handleChatError(error, t, errorType);
        }
      } finally {
        setSending(false);
      }
  }, [inputText, conversationId, currentUserId, sending, t, deduplicateMessages, productInfo, otherUserId, navigation]);

  // Improved message loading function with explicit error handling and limits
  const fetchMessages = useCallback(async (targetConversationId) => {
    const convoId = targetConversationId || conversationId;
  
    if (!convoId || !currentUserId) {
      // No conversation yet - this is normal for new chats
      setMessages([]);
      return;
    }
  
    try {
      setLoading(true);
      

  
      // Fetch messages with no limit and proper ordering
      const { data: fetchedMessages, error } = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          read_by,
          created_at,
          profiles!sender_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq('conversation_id', convoId)
        .order('created_at', { ascending: true });
  
      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
      

      
      
      if (isMounted.current) {
        setMessages(fetchedMessages || []);
        
        // Mark messages as read after loading them
        if (fetchedMessages && fetchedMessages.length > 0) {
          const unreadMessages = fetchedMessages.filter(msg => {
            const readBy = parseReadBy(msg.read_by);
            return msg.sender_id !== currentUserId && !readBy.includes(currentUserId);
          });
          
          if (unreadMessages.length > 0) {
            await markMessagesAsRead(convoId, currentUserId);
            // Force refresh conversation list
            triggerConversationsRefresh();
            // Update global unread count
            if (refreshUnreadCount) {
              await refreshUnreadCount();
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchMessages:', error);
      if (isMounted.current) {
        setError(error);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [conversationId, currentUserId, refreshUnreadCount]);

  // Add this useEffect to directly mark messages as read once when entering the conversation
  useEffect(() => {
    const updateReadStatus = async () => {
      if (!conversationId || !currentUserId || !otherUserId || messages.length === 0) {
        return;
      }

      try {
        
        // Find unread messages from the other user
        const unreadMessages = messages.filter(msg => {
          const readBy = parseReadBy(msg.read_by);
          return msg.sender_id === otherUserId && !readBy.includes(currentUserId);
        });
        
        if (unreadMessages.length === 0) {
          return;
        }
        
        
        // Call the original markMessagesAsRead function
        const success = await markMessagesAsRead(conversationId, currentUserId);
        
        if (success) {
          // Update global notification count
          if (refreshUnreadCount) {
            await refreshUnreadCount();
          }
          
          // Force refresh conversations list immediately
          triggerConversationsRefresh();
          
          // Emit event to notify ConversationsScreen about read status update
          EventRegister.emit('MESSAGES_MARKED_AS_READ', { conversationId });
          
          // Update local state to reflect read status immediately
          setMessages(prevMessages => 
            prevMessages.map(msg => {
              // Only update messages from the other user that haven't been read
              const readBy = parseReadBy(msg.read_by);
              if (msg.sender_id === otherUserId && !readBy.includes(currentUserId)) {
                return {
                  ...msg,
                  read_by: [...(msg.read_by || []), currentUserId]
                };
              }
              return msg;
            })
          );
        }
        
      } catch (error) {
        console.error('Error updating read status:', error);
      }
    };
    
    // Run once when component mounts and messages are loaded
    updateReadStatus();
    
  }, [conversationId, currentUserId, otherUserId, messages.length]);

  // Add focus effect to update read status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const updateReadStatusOnFocus = async () => {
        if (!conversationId || !currentUserId || !otherUserId || messages.length === 0) {
          return;
        }

        try {
          const unreadMessages = messages.filter(msg => {
            const readBy = parseReadBy(msg.read_by);
            return msg.sender_id === otherUserId && !readBy.includes(currentUserId);
          });
          
          if (unreadMessages.length > 0) {
            const success = await markMessagesAsRead(conversationId, currentUserId);
            if (success) {
              // Update global notification count
              if (refreshUnreadCount) {
                await refreshUnreadCount();
              }
              
              // Force refresh conversations list
              triggerConversationsRefresh();
              
              // Emit event to notify ConversationsScreen about read status update
              EventRegister.emit('MESSAGES_MARKED_AS_READ', { conversationId });
              
              // Update local message state to reflect read status
              setMessages(prevMessages => 
                prevMessages.map(msg => {
                  const readBy = parseReadBy(msg.read_by);
                  if (msg.sender_id === otherUserId && !readBy.includes(currentUserId)) {
                    return {
                      ...msg,
                      read_by: [...readBy, currentUserId]
                    };
                  }
                  return msg;
                })
              );
            }
          }
        } catch (error) {
          console.error('Error updating read status on focus:', error);
        }
      };

      updateReadStatusOnFocus();
    }, [conversationId, currentUserId, otherUserId, messages.length, refreshUnreadCount])
  ); 

  // Add info button to header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 16 }}
          onPress={() => {
            showUserInfoModal();
          }}
        >
          <Ionicons name="information-circle" size={24} color={colors.headerText} />
        </TouchableOpacity>
      )
    });
  }, [navigation, colors.headerText, otherUserProfile]);

  // Show user info modal
  const showUserInfoModal = useCallback(() => {
    setShowUserModal(true);
  }, []);

  // Handle report user
  const handleReportUser = useCallback(async () => {
    try {
      const telegramBotURL = 'https://t.me/ushopsfubot';
      const canOpen = await Linking.canOpenURL(telegramBotURL);
      
      if (canOpen) {
        await Linking.openURL(telegramBotURL);
      } else {
        Alert.alert(
          t('error'),
          t('unableToOpenLink'),
          [{ text: t('ok'), style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Error opening Telegram bot:', error);
      Alert.alert(
        t('error'),
        t('unableToOpenLink'),
        [{ text: t('ok'), style: 'default' }]
      );
    }
  }, [t]);

  // Handle block user
  const handleBlockUser = useCallback(async () => {
    Alert.alert(
      t('blockUser'),
      t('blockUserConfirmation'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('block'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(otherUserId);
              setIsUserBlocked(true);
              Alert.alert(t('success'), t('userBlocked'));
              setShowUserModal(false);
              // Navigate back to conversations since user is now blocked
              navigation.goBack();
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert(t('error'), error.message || t('blockUserError'));
            }
          }
        }
      ]
    );
  }, [t, otherUserId, navigation]);

  // Handle unblock user
  const handleUnblockUser = useCallback(async () => {
    Alert.alert(
      t('unblockUser'),
      t('unblockUserConfirmation'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('unblock'), 
          style: 'default',
          onPress: async () => {
            try {
              await unblockUser(otherUserId);
              setIsUserBlocked(false);
              Alert.alert(t('success'), t('userUnblocked'));
              setShowUserModal(false);
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert(t('error'), error.message || t('unblockUserError'));
            }
          }
        }
      ]
    );
  }, [t, otherUserId]);

  // Test function to manually trigger conversation update
  const testConversationUpdate = useCallback(() => {

    EventRegister.emit('CONVERSATION_UPDATED', { conversationId });
  }, [conversationId]);

  // Polling fallback for when real-time fails (disabled to prevent flinching)
  // useEffect(() => {
  //   if (!conversationId || !currentUserId) return;
    
  //   const pollInterval = setInterval(() => {
  //     // Only poll if we don't have an active subscription or if it's in error state
  //     if (!subscriptionRef.current || subscriptionRef.current === 'ERROR') {
  //       console.log('Polling for new messages (fallback)...');
  //       fetchMessages();
  //     }
  //   }, 3000); // Poll every 3 seconds as fallback
    
  //   return () => clearInterval(pollInterval);
  // }, [conversationId, currentUserId, fetchMessages]);

  // Auto-scroll to bottom when new messages arrive (optimized to prevent flinching)
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      // Only scroll if we're near the bottom to prevent flinching
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
        }
      }, 100);
    }
  }, [messages]);

  // Group messages by date
  const groupMessagesByDate = useCallback((messagesList) => {
    const grouped = [];
    let currentDate = null;
    
    messagesList.forEach((message) => {
      const messageDate = new Date(message.created_at).toDateString();
      
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        grouped.push({
          type: 'date',
          date: message.created_at,
          id: `date-${messageDate}`
        });
      }
      
      grouped.push({
        type: 'message',
        ...message
      });
    });
    
    return grouped;
  }, []);

  // Better key extraction for FlatList to avoid duplicate key warnings
  const keyExtractor = useCallback((item) => {
    if (item.type === 'date') {
      return item.id;
    }
    // For temporary messages, add a suffix to ensure uniqueness
    if (item.isTemp) {
      return `${item.id}-${item.created_at}`;
    }
    return item.id;
  }, []);

  // Format date for message timestamp
  const formatMessageTime = useCallback((dateString) => {
    const date = new Date(dateString);
    return format(date, 'HH:mm');
  }, []);

  // Format date for date separator
  const formatDateSeparator = useCallback((dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return t('today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('yesterday');
    } else {
      // Use translated month and day names
      const monthName = t(`month_${format(date, 'M')}`);
      const dayName = t(`day_${format(date, 'E')}`);
      return `${dayName}, ${monthName} ${format(date, 'd')}`;
    }
  }, [t]);

  // Update the renderMessageItem function to handle both messages and date separators
  const renderMessageItem = useCallback(({ item }) => {
    // Render date separator
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparatorContainer}>
          <View style={[styles.dateSeparator, { backgroundColor: colors.surface }]}>
            <Text style={[styles.dateSeparatorText, { color: colors.textSecondary }]}>
              {formatDateSeparator(item.date)}
            </Text>
          </View>
        </View>
      );
    }
    
    // Render message
    const isCurrentUser = item.sender_id === currentUserId;
    
    // Calculate read status correctly using the read_by array
    let isRead = false;
    if (isCurrentUser && item.read_by) {
      // Check if the other user has read the message
      const readBy = parseReadBy(item.read_by);
      isRead = readBy.includes(otherUserId);
    }
    
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer,
      ]}>
        <View style={[
          styles.messageBubble,
          isCurrentUser ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
        ]}>
          <Text style={[
            styles.messageText,
            { color: isCurrentUser ? colors.headerText : colors.text }
          ]}>
            {item.content}
          </Text>
          
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, { color: colors.textSecondary }]}>
              {formatMessageTime(item.created_at)}
            </Text>
            
            {isCurrentUser && (
              <Ionicons 
                name={isRead ? "checkmark-done" : "checkmark"} 
                size={12} 
                color={isRead ? colors.headerText : colors.headerText}
                style={styles.readStatusIcon}
              />
            )}
          </View>
        </View>
      </View>
    );
  }, [currentUserId, otherUserId, formatMessageTime, formatDateSeparator, colors]);

  // Render product info card when chat is initiated from a product details screen
  const renderProductInfo = () => {
    if (!productInfo) return null;

    const isProductDeleted = productInfo.is_deleted;

    return (
      <View style={[styles.productInfoContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.productInfoHeader}>
          <Text style={[styles.productInfoTitle, { color: colors.text }]}>
            {productInfo.type === 'buy_order' ? t('lookingFor') : t('Product')}
          </Text>
          <View style={[
            styles.productTypeTag, 
            { backgroundColor: productInfo.type === 'buy_order' ? colors.secondary : colors.primary }
          ]}>
            <Text style={[styles.productTypeText, { color: colors.headerText }]}>
              {productInfo.type === 'buy_order' ? t('wantToBuy') : t('forSale')}
            </Text>
          </View>
        </View>
        
        <View style={styles.productInfoContent}>
          {isProductDeleted ? (
            <Image
              source={require('../../assets/deleted_product_placeholder.webp')}
              style={[styles.productInfoImage, { borderColor: colors.border }]}
              resizeMode="cover"
            />
          ) : productInfo.mainImage ? (
            <Image
              source={{ uri: productInfo.mainImage }}
              style={[styles.productInfoImage, { borderColor: colors.border }]}
              resizeMode="cover"
            />
          ) : null}
          
          <View style={styles.productInfoDetails}>
            <Text style={[styles.productInfoName, { color: colors.text }]} numberOfLines={2}>
              {isProductDeleted ? t('deletedProduct') : productInfo.name}
            </Text>
            
            {productInfo.price && (
              <Text style={[styles.productInfoPrice, { color: colors.primary }]}>
                ₽{productInfo.price}
              </Text>
            )}
            
            <View style={styles.productInfoMeta}>
              <View style={styles.productInfoMetaItem}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.productInfoMetaText, { color: colors.textSecondary }]}>
                  {productInfo.dorm || t('Location not specified')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Component mount/unmount handling
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Set up real-time subscription for new messages and updates
  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    
    // For deleted users, we don't need real-time updates
    if (!otherUserId) return;
    
    let isActiveSubscription = true;
    let retryCount = 0;
    const maxRetries = 3;
    
    // Clean up any existing subscriptions
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    

    
    // Create a unique channel for this conversation
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          if (!isActiveSubscription || !isMounted.current) return;
          

          
          try {
            // Fetch the complete message with sender profile
            const { data: newMessage, error } = await supabase
              .from('messages')
              .select(`
                id, 
                conversation_id,
                sender_id,
                content,
                read_by,
                created_at,
                profiles!sender_id (
                  id,
                  username,
                  avatar_url
                )
              `)
              .eq('id', payload.new.id)
              .single();
              
            if (error) throw error;
            
            if (isMounted.current && isActiveSubscription) {

              
              // Seamlessly add the new message to state without causing a visible refresh
              setMessages(prevMessages => {
                // Check if we already have this message to avoid duplicates
                const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
                if (messageExists) {

                  return prevMessages;
                }
                
                // Remove any temporary versions
                const filteredMessages = prevMessages.filter(msg => 
                  !(msg.isTemp && msg.content === newMessage.content)
                );
                
                // Add new message and sort
                const updatedMessages = [...filteredMessages, newMessage]
                  .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                

                return updatedMessages;
              });
              
              // If message is from other user, mark it as read silently
              if (newMessage.sender_id === otherUserId) {

                // Mark as read immediately
                markMessagesAsRead(conversationId, currentUserId)
                  .then(() => {
                    
                    // Update the conversations list immediately
                    triggerConversationsRefresh();
                    
                    // Also update local message state to show read status
                    setMessages(prevMessages => 
                      prevMessages.map(msg => {
                        const readBy = parseReadBy(msg.read_by);
                        return msg.sender_id === otherUserId && !readBy.includes(currentUserId)
                          ? { ...msg, read_by: [...readBy, currentUserId] }
                          : msg;
                      })
                    );
                  })
                  .catch(err => console.error('Error marking message as read:', err));
              }
            }
          } catch (error) {
            console.error('Error handling new message:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          if (!isActiveSubscription || !isMounted.current) return;
          
          
          
          // Update the specific message that was changed
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
            )
          );
          
          // If this is a read status update, also refresh conversations
          if (payload.new.read_by && payload.new.sender_id === currentUserId) {
            triggerConversationsRefresh();
          }
        }
      )
      .subscribe((status, error) => {
        if (error) {
          console.error('Subscription error:', error);
          if (retryCount < maxRetries && isActiveSubscription) {
            retryCount++;
            
            setTimeout(() => {
              if (isActiveSubscription) {
                // Recreate the subscription
                const newChannel = supabase
                  .channel(`chat-${conversationId}-retry-${retryCount}`)
                  .on(
                    'postgres_changes',
                    {
                      event: 'INSERT',
                      schema: 'public',
                      table: 'messages',
                      filter: `conversation_id=eq.${conversationId}`
                    },
                    async (payload) => {
                      if (!isActiveSubscription || !isMounted.current) return;
                      // Handle new message (same logic as above)
                      try {
                        const { data: newMessage, error } = await supabase
                          .from('messages')
                          .select(`
                            id, 
                            conversation_id,
                            sender_id,
                            content,
                            read_by,
                            created_at,
                            profiles!sender_id (
                              id,
                              username,
                              avatar_url
                            )
                          `)
                          .eq('id', payload.new.id)
                          .single();
                          
                        if (error) throw error;
                        
                        if (isMounted.current && isActiveSubscription) {
                          setMessages(prevMessages => {
                            const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
                            if (messageExists) return prevMessages;
                            
                            const filteredMessages = prevMessages.filter(msg => 
                              !(msg.isTemp && msg.content === newMessage.content)
                            );
                            
                            return [...filteredMessages, newMessage]
                              .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                          });
                          
                          if (newMessage.sender_id === otherUserId) {
                            markMessagesAsRead(conversationId, currentUserId)
                              .then(() => {
                                triggerConversationsRefresh();
                                setMessages(prevMessages => 
                                  prevMessages.map(msg => 
                                    msg.sender_id === otherUserId && 
                                    (!msg.read_by || !msg.read_by.includes(currentUserId))
                                      ? { ...msg, read_by: [...(msg.read_by || []), currentUserId] }
                                      : msg
                                  )
                                );
                              })
                              .catch(err => console.error('Error marking message as read:', err));
                          }
                        }
                      } catch (error) {
                        console.error('Error handling new message:', error);
                      }
                    }
                  )
                  .subscribe((status, error) => {
                    if (error) {
                      console.error('Retry subscription error:', error);
                    } else {
                      
                      subscriptionRef.current = newChannel;
                    }
                  });
              }
            }, 1000);
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error - subscription failed');
          if (retryCount < maxRetries && isActiveSubscription) {
            retryCount++;
            
            setTimeout(() => {
              if (isActiveSubscription) {
                // Recreate the subscription
                const newChannel = supabase
                  .channel(`chat-${conversationId}-retry-${retryCount}`)
                  .on(
                    'postgres_changes',
                    {
                      event: 'INSERT',
                      schema: 'public',
                      table: 'messages',
                      filter: `conversation_id=eq.${conversationId}`
                    },
                    async (payload) => {
                      if (!isActiveSubscription || !isMounted.current) return;
                      // Handle new message (same logic as above)
                      try {
                        const { data: newMessage, error } = await supabase
                          .from('messages')
                          .select(`
                            id, 
                            conversation_id,
                            sender_id,
                            content,
                            read_by,
                            created_at,
                            profiles!sender_id (
                              id,
                              username,
                              avatar_url
                            )
                          `)
                          .eq('id', payload.new.id)
                          .single();
                          
                        if (error) throw error;
                        
                        if (isMounted.current && isActiveSubscription) {
                          setMessages(prevMessages => {
                            const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
                            if (messageExists) return prevMessages;
                            
                            const filteredMessages = prevMessages.filter(msg => 
                              !(msg.isTemp && msg.content === newMessage.content)
                            );
                            
                            return [...filteredMessages, newMessage]
                              .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                          });
                          
                          if (newMessage.sender_id === otherUserId) {
                            markMessagesAsRead(conversationId, currentUserId)
                              .then(() => {
                                triggerConversationsRefresh();
                                setMessages(prevMessages => 
                                  prevMessages.map(msg => 
                                    msg.sender_id === otherUserId && 
                                    (!msg.read_by || !msg.read_by.includes(currentUserId))
                                      ? { ...msg, read_by: [...(msg.read_by || []), currentUserId] }
                                      : msg
                                  )
                                );
                              })
                              .catch(err => console.error('Error marking message as read:', err));
                          }
                        }
                      } catch (error) {
                        console.error('Error handling new message:', error);
                      }
                    }
                  )
                  .subscribe((status, error) => {
                    if (error) {
                      console.error('Retry subscription error:', error);
                    } else {
                      
                      subscriptionRef.current = newChannel;
                    }
                  });
              }
            }, 1000);
          }
        } else {
          
          retryCount = 0; // Reset retry count on success
        }
      });
    
    // Store subscription reference for cleanup
    subscriptionRef.current = channel;
    
    return () => {
      
      isActiveSubscription = false;
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [conversationId, currentUserId, otherUserId]);

  if (!currentUserId) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ErrorBoundaryWrapper
      onRetry={initializeConversation}
      loadingMessage={t('loadingChat')}
      errorMessage={error?.message || t('errorLoadingChat')}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
        <KeyboardAvoidingView
          style={[styles.container, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {loading ? (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('loadingChat')}</Text>
            </View>
          ) : error ? (
            <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{t('errorLoadingChat')}</Text>
              <TouchableOpacity 
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                onPress={initializeConversation}
              >
                <Text style={[styles.retryButtonText, { color: colors.headerText }]}>{t('retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>

              {renderProductInfo()}
              <FlatList
                ref={flatListRef}
                data={groupMessagesByDate(messages)}
                keyExtractor={keyExtractor}
                renderItem={renderMessageItem}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => {
                  // Only scroll if we have messages and the list is near the bottom
                  if (flatListRef.current && messages.length > 0) {
                    setTimeout(() => {
                      if (flatListRef.current) {
                        flatListRef.current.scrollToEnd({ animated: false });
                      }
                    }, 50);
                  }
                }}
                onLayout={() => {
                  // Only scroll on initial layout
                  if (flatListRef.current && messages.length > 0) {
                    setTimeout(() => {
                      if (flatListRef.current) {
                        flatListRef.current.scrollToEnd({ animated: false });
                      }
                    }, 100);
                  }
                }}
                ListEmptyComponent={
                  <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('No messages yet')}</Text>
                    <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>{t('Start the conversation!')}</Text>
                  </View>
                }
              />

              <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={t('Type a message...')}
                  placeholderTextColor={colors.placeholder}
                  multiline
                  onFocus={() => {
                    // Delay scroll to prevent flinching
                    setTimeout(() => {
                      if (flatListRef.current && messages.length > 0) {
                        flatListRef.current.scrollToEnd({ animated: false });
                      }
                    }, 300);
                  }}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    { backgroundColor: colors.primary },
                    (!inputText.trim() || sending) && { backgroundColor: colors.disabled }
                  ]}
                  onPress={handleSendMessage}
                  disabled={!inputText.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color={colors.headerText} />
                  ) : (
                    <Ionicons name="send" size={20} color={colors.headerText} />
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAvoidingView>

        {/* User Info Modal */}
        <Modal
          visible={showUserModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowUserModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t('userInfo')}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowUserModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.userInfoContainer}>
                {/* User Avatar */}
                <View style={styles.modalUserAvatarContainer}>
                  {otherUserProfile?.avatar_url ? (
                    <Image
                      source={{ 
                        uri: getAvatarUrl(otherUserProfile.avatar_url),
                        cache: 'force-cache'
                      }}
                      style={styles.modalUserAvatar}
                      defaultSource={require('../../assets/default-avatar.png')}
                    />
                  ) : (
                    <View style={[styles.modalUserAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.modalUserAvatarText, { color: colors.headerText }]}>
                        {otherUserProfile?.username?.[0]?.toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* User Details */}
                <View style={styles.userDetailsContainer}>
                  <Text style={[styles.userName, { color: colors.text }]}>
                    {otherUserProfile?.username || t('Unknown User')}
                  </Text>
                  <View style={styles.userDetailRow}>
                    <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.userDetailText, { color: colors.textSecondary }]}>
                      {otherUserProfile?.dorm || t('Location not specified')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.secondary }]}
                  onPress={handleReportUser}
                >
                  <Ionicons name="flag-outline" size={20} color={colors.headerText} />
                  <Text style={[styles.actionButtonText, { color: colors.headerText }]}>
                    {t('reportUser')}
                  </Text>
                </TouchableOpacity>

                {isUserBlocked ? (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                    onPress={handleUnblockUser}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color={colors.headerText} />
                    <Text style={[styles.actionButtonText, { color: colors.headerText }]}>
                      {t('unblockUser')}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.error }]}
                    onPress={handleBlockUser}
                  >
                    <Ionicons name="ban-outline" size={20} color={colors.headerText} />
                    <Text style={[styles.actionButtonText, { color: colors.headerText }]}>
                      {t('blockUser')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ErrorBoundaryWrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  currentUserContainer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  otherUserContainer: {
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  messageBubble: {
    padding: 14,
    borderRadius: 20,
    maxWidth: '100%',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 12,
    opacity: 0.8,
  },
  readStatusContainer: {
    width: 15,
    height: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIcon: {
    marginLeft: 4,
  },
  readStatusIcon: {
    marginLeft: 0,
  },
  dateSeparatorContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    maxHeight: 100,
    fontSize: 16,
    borderWidth: 1,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tempMessage: {
    opacity: 0.7,
  },
  errorMessage: {
    opacity: 0.5,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  // User Avatar in Header
  headerUserAvatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
  },
  headerUserAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  headerUserAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerUserAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  // User Info
  headerUserInfo: {
    flex: 1,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Product Info Styles
  productInfoContainer: {
    margin: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  productInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  productInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  productTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  productTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  productInfoContent: {
    flexDirection: 'row',
    padding: 12,
  },
  productInfoImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
  },
  productInfoDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productInfoName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productInfoPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productInfoDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
  },
  productInfoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productInfoMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productInfoMetaText: {
    fontSize: 12,
    marginLeft: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalUserAvatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: 16,
  },
  modalUserAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  modalUserAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalUserAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  userDetailsContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  userDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDetailText: {
    fontSize: 14,
    marginLeft: 6,
  },
  modalActions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatScreen;
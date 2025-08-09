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
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UnreadContext } from '../../context/UnreadContext';
import ErrorBoundaryWrapper from '../../components/ErrorBoundary/ErrorBoundaryWrapper';
import { handleChatError } from '../../utils/chatErrorHandler';
import { checkNetworkConnection } from '../../utils/networkUtils';
import { useFocusEffect } from '@react-navigation/native';

// Update the logging utility at the top
const logEvent = (eventName, data) => {
};

const ChatScreen = ({ route }) => {
  const { conversationId: initialConversationId, otherUserId, otherUserName } = route.params || {};
  const navigation = useNavigation();
  const { t } = useTranslation();
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

  const flatListRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Add a component mount reference to ensure we properly handle the lifecycle
  const isMounted = useRef(true);

  // Update the navigation useEffect with this headerLeft configuration
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
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.headerAvatarWrapper}>
              {otherUserProfile?.avatar_url ? (
                <Image
                  source={{ 
                    uri: getAvatarUrl(otherUserProfile.avatar_url),
                    cache: 'force-cache'
                  }}
                  style={styles.headerAvatar}
                  defaultSource={require('../../assets/default-avatar.png')}
                />
              ) : (
                <View style={styles.headerAvatarPlaceholder}>
                  <Text style={styles.headerAvatarText}>
                    {otherUserProfile?.username?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {otherUserProfile?.username || t('Chat')}
            </Text>
          </View>
        </View>
      ),
      headerStyle: {
        backgroundColor: '#104d59',
        elevation: 2,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
      },
    });
  }, [navigation, otherUserProfile, t]);

  // Get current user ID
  useEffect(() => {
    const getCurrentUserId = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUserId(data.user.id);
      }
    };
    
    getCurrentUserId();
  }, []);

  // Fetch other user's profile for avatar
  useEffect(() => {
    const fetchOtherUserProfile = async () => {
      if (!otherUserId) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url, dorm')
          .eq('id', otherUserId)
          .single();

        if (error) {
          console.error('Error fetching other user profile:', error);
          return;
        }

        setOtherUserProfile(data);
        // Set avatar source if available
        if (data?.avatar_url) {
          setAvatarSource({ uri: data.avatar_url });
        }
      } catch (error) {
        console.error('Error in fetchOtherUserProfile:', error);
      }
    };

    fetchOtherUserProfile();
  }, [otherUserId]);

  // In your ChatScreen component where you navigate
  useEffect(() => {
    // Update navigation params when user info changes
    navigation.setParams({
      otherUserName: otherUserProfile?.username || 'Chat',
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

  // Initialize conversation
  const initializeConversation = useCallback(async () => {
    if (!currentUserId || !otherUserId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        throw new Error('network');
      }

      if (conversationId) {
        await fetchMessages();
      } else {
        await cleanupStuckMessages();
        const conversation = await findOrCreateConversation(otherUserId);
        
        if (!conversation) {
          throw new Error('conversation_create_failed');
        }

        setConversationId(conversation.conversation_id);
        navigation.setParams({ conversationId: conversation.conversation_id });
        await fetchMessages(conversation.conversation_id);
      }
    } catch (error) {
      setError(error);
      const errorType = error.message === 'network' ? 'NETWORK' : 'INIT_CHAT';
      handleChatError(error, t, errorType);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, otherUserId, conversationId, navigation, fetchMessages, cleanupStuckMessages, t]);

  // Update the useEffect to use the new function
  useEffect(() => {
    if (currentUserId) {
      initializeConversation();
    }
  }, [currentUserId, initializeConversation]);

  // Function to clean up stuck messages
  const cleanupStuckMessages = async () => {
    try {
      if (!otherUserId || !currentUserId) return;
      
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
    
    if (!conversationId) {
      handleChatError(new Error('no_conversation'), t, 'INIT_CHAT');
      return;
    }
    
    setSending(true);
    const messageText = inputText.trim();
    setInputText('');
    
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const [side1Id, side2Id] = conversationId.split('_');
    
    const tempMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: messageText,
      side1_read: currentUserId === side1Id,
      side2_read: currentUserId === side2Id,
      created_at: new Date().toISOString(),
      isTemp: true
    };
    
    try {
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
      const sentMessage = await sendMessage(conversationId, messageText);
      
      // Replace temp message with real one
      setMessages(prev => {
        const withoutTemp = prev.filter(msg => 
          msg.id !== tempId && !msg.isTemp
        );
        return deduplicateMessages([...withoutTemp, sentMessage]);
      });
    } catch (error) {
      setError(error);
      const errorType = error.message === 'network' ? 'NETWORK' : 'SEND_MESSAGE';
      handleChatError(error, t, errorType);
    } finally {
      setSending(false);
    }
  }, [inputText, conversationId, currentUserId, sending, t, deduplicateMessages]);

  // Improved message loading function with explicit error handling and limits
  const fetchMessages = useCallback(async (targetConversationId) => {
    const convoId = targetConversationId || conversationId;
  
    if (!convoId || !currentUserId) {
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
          const unreadMessages = fetchedMessages.filter(msg => 
            msg.sender_id !== currentUserId && 
            (!msg.read_by || !msg.read_by.includes(currentUserId))
          );
          
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
        const unreadMessages = messages.filter(msg => 
          msg.sender_id === otherUserId && 
          (!msg.read_by || !msg.read_by.includes(currentUserId))
        );
        
        if (unreadMessages.length === 0) {
          return;
        }
        
        
        // Call the original markMessagesAsRead function
        const success = await markMessagesAsRead(conversationId, currentUserId);
        
        // Update global notification count
        if (refreshUnreadCount) {
          await refreshUnreadCount();
        }
        
        // Force refresh conversations list
        triggerConversationsRefresh();
        
        // No need to refresh the message list - just manually update the local state
        setMessages(prevMessages => 
          prevMessages.map(msg => {
            // Only update messages from the other user that haven't been read
            if (msg.sender_id === otherUserId && 
                (!msg.read_by || !msg.read_by.includes(currentUserId))) {
              return {
                ...msg,
                read_by: [...(msg.read_by || []), currentUserId]
              };
            }
            return msg;
          })
        );
        
      } catch (error) {
        console.error('Error updating read status:', error);
      }
    };
    
    // Run once when component mounts and messages are loaded
    updateReadStatus();
    
    // Only run once when mounted - [] dependency array would run on every message change
  }, [conversationId, currentUserId, otherUserId, messages.length]); 

  // Simplify header by just adding a refresh button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          style={{ marginRight: 15 }}
          onPress={() => {
            fetchMessages();
            triggerConversationsRefresh();
          }}
        >
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      )
    });
  }, [navigation, fetchMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: false });
    }
  }, [messages]);

  // Better key extraction for FlatList to avoid duplicate key warnings
  const keyExtractor = useCallback((item) => {
    // For temporary messages, add a suffix to ensure uniqueness
    if (item.isTemp) {
      return `${item.id}-${item.created_at}`;
    }
    return item.id;
  }, []);

  // Format date for message timestamp
  const formatMessageTime = useCallback((dateString) => {
    const date = new Date(dateString);
    return format(date, 'h:mm a');
  }, []);

  // Update the renderMessageItem function to be extra clear about read receipts
  const renderMessageItem = useCallback(({ item }) => {
    const isCurrentUser = item.sender_id === currentUserId;
    
    // Extra debug info for read status
    if (isCurrentUser) {
      const isRead = Array.isArray(item.read_by) && item.read_by.includes(otherUserId);
    }
    
    // Calculate read status correctly using the read_by array
    let isRead = false;
    if (isCurrentUser && item.read_by) {
      // Check if the other user has read the message
      isRead = Array.isArray(item.read_by) && item.read_by.includes(otherUserId);
    }
    
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer,
      ]}>
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText
          ]}>
            {item.content}
          </Text>
          
          <View style={styles.messageFooter}>
            <Text style={styles.messageTime}>
              {formatMessageTime(item.created_at)}
            </Text>
            
            {isCurrentUser && (
              <Ionicons 
                name={isRead ? "checkmark-done" : "checkmark"} 
                size={12} 
                color={isRead ? "#4FC3F7" : "#999"}
                style={styles.readStatusIcon}
              />
            )}
          </View>
        </View>
      </View>
    );
  }, [currentUserId, otherUserId, formatMessageTime]);

  // Component mount/unmount handling
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Set up real-time subscription for new messages and updates - with stable deps
  useEffect(() => {
    if (!conversationId || !currentUserId || !otherUserId) return;
    
    let isActiveSubscription = true;
    
    // Clean up any existing subscriptions
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    
    
    // Create a unique channel for this conversation
    const channel = supabase
      .channel(`chat-${conversationId}-${Date.now()}`)
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
                return [...filteredMessages, newMessage]
                  .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
              });
              
              // If message is from other user, mark it as read silently
              if (newMessage.sender_id === otherUserId) {
                // Silently mark as read without causing UI updates
                setTimeout(() => {
                  markMessagesAsRead(conversationId, currentUserId)
                    .then(() => {
                      // Update the conversations list without triggering a full UI refresh
                      triggerConversationsRefresh();
                    })
                    .catch(err => console.error('Error marking message as read:', err));
                }, 500);
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
          
          
          // Just update the specific message that was changed instead of refreshing all messages
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
            )
          );
        }
      )
      .subscribe((status, error) => {
        if (error) {
          console.error('Subscription error:', error);
        } else {
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff5722" />
      </View>
    );
  }

  return (
    <ErrorBoundaryWrapper
      onRetry={initializeConversation}
      loadingMessage={t('loadingChat')}
      errorMessage={error?.message || t('errorLoadingChat')}
    >
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ff5722" />
              <Text style={styles.loadingText}>{t('loadingChat')}</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{t('errorLoadingChat')}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={initializeConversation}
              >
                <Text style={styles.retryButtonText}>{t('retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={keyExtractor}
                renderItem={renderMessageItem}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => {
                  if (flatListRef.current && messages.length > 0) {
                    flatListRef.current.scrollToEnd({ animated: false });
                  }
                }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>{t('No messages yet')}</Text>
                    <Text style={styles.emptySubtext}>{t('Start the conversation!')}</Text>
                  </View>
                }
              />

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={t('Type a message...')}
                  placeholderTextColor="#999"
                  multiline
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!inputText.trim() || sending) && styles.sendButtonDisabled
                  ]}
                  onPress={handleSendMessage}
                  disabled={!inputText.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ErrorBoundaryWrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    color: '#999',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: '80%',
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
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#888',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '100%',
  },
  currentUserBubble: {
    backgroundColor: '#ff5722',
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
  },
  currentUserText: {
    color: '#fff',
  },
  otherUserText: {
    color: '#333',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginRight: 4,
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
    marginLeft: 2,
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
    color: '#888',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff5722',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#ffccbc',
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
  headerAvatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#e1e1e1',
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
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
    color: '#ff5722',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#ff5722',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChatScreen;
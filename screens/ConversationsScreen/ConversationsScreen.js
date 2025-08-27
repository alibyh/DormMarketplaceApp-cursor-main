import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { UnreadContext } from '../../context/UnreadContext';
import { useTheme } from '../../context/ThemeContext';
import { EventRegister } from 'react-native-event-listeners';
import {
  getConversations as getConversationsService,
  getTotalUnreadConversations,
  subscribeToConversations,
  getCurrentUser,
  ERROR_CODES,
  triggerConversationsRefresh,
} from '../../services/messageService';
import supabase from '../../services/supabaseConfig';
import { checkNetworkConnection } from '../../utils/networkUtils';
import ErrorBoundaryWrapper from '../../components/ErrorBoundary/ErrorBoundaryWrapper';
import { handleConversationsError } from '../../utils/conversationsErrorHandler';
import { checkAuthenticationWithFallback } from '../../utils/authUtils';

// Create logger for ConversationsScreen
const createLogger = (prefix) => ({
  // Only log errors by default
  log: (...args) => {
  },
  error: (...args) => console.error(`[${prefix}] ERROR:`, ...args),
  warn: (...args) => console.warn(`[${prefix}] WARNING:`, ...args),
  info: (...args) => {
    // Uncomment for debugging
    // console.info(`[${prefix}] INFO:`, ...args);
  },
});

const logger = createLogger('ConversationsScreen');

// Add ERROR_TYPES constant
const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  AUTH: 'AUTH',
  FETCH_CONVERSATIONS: 'FETCH_CONVERSATIONS',
  SUBSCRIPTION: 'SUBSCRIPTION',
  UNKNOWN: 'UNKNOWN'
};

// Debounce utility function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const formatMessageTime = (dateString, t) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return '';
    }
    
    // If message is from today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    }
    
    // If message is from yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return t('yesterday');
    }
    
    // If message is from this year
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric'
      });
    }
    
    // If message is from a different year
    return date.toLocaleDateString([], { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric'
    });
  } catch (err) {
    logger.error('Error formatting message time:', err);
    return '';
  }
};

const ConversationsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { setTotalUnreadConversations } = useContext(UnreadContext);
  const { getThemeColors } = useTheme();
  const colors = getThemeColors();
  
  // State
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isNetworkError, setIsNetworkError] = useState(false);
  
  // Refs for preventing rapid updates
  const lastUpdateTime = useRef(0);
  const isUpdating = useRef(false);
  const pendingRefresh = useRef(false);
  const mounted = useRef(true);
  const lastConversationsHash = useRef('');
  
  // Helper function to create a hash of conversations for comparison
  const createConversationsHash = useCallback((conversations) => {
    if (!conversations || conversations.length === 0) return '';
    
    return conversations.map(conv => 
      `${conv.conversation_id}-${conv.last_message_at}-${conv.unreadCount}-${conv.lastMessageRead}-${conv.last_message}`
    ).join('|');
  }, []);
  
  // Helper function to check if conversations have actually changed
  const hasConversationsChanged = useCallback((newConversations) => {
    const newHash = createConversationsHash(newConversations);
    const hasChanged = newHash !== lastConversationsHash.current;
    lastConversationsHash.current = newHash;
    return hasChanged;
  }, [createConversationsHash]);
  
  // Get current user ID and check authentication
  useEffect(() => {
    const getUser = async () => {
      try {
        const { user, isNetworkError: networkError, error } = await checkAuthenticationWithFallback();
        
        if (networkError) {
          // Network error - show network error UI

          setIsNetworkError(true);
          setIsAuthenticated(false);
        } else if (user) {
          setCurrentUserId(user.id);
          setIsAuthenticated(true);
          setIsNetworkError(false);
        } else {
          setIsAuthenticated(false);
          setIsNetworkError(false);
        }
      } catch (err) {
        console.error('Error getting current user:', err);
        setIsAuthenticated(false);
        setIsNetworkError(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    getUser();
  }, []);
  
  // Update the navigation options useEffect
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: t('Messages'),
      headerStyle: {
        backgroundColor: colors.headerBackground,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: colors.headerText,
      headerTitleStyle: {
        fontWeight: 'bold',
        fontSize: 20,
      },
    });
  }, [navigation, t, colors]);
  


  // Debounced fetch conversations to prevent rapid updates
  const debouncedFetchConversations = useCallback(
    debounce(async (showLoading = true) => {
      if (!mounted.current || isUpdating.current) {
        pendingRefresh.current = true;
        return;
      }

      const now = Date.now();
      if (now - lastUpdateTime.current < 200) { // Prevent updates more frequent than 200ms
        pendingRefresh.current = true;
        return;
      }

      isUpdating.current = true;
      lastUpdateTime.current = now;

      try {
        if (showLoading && isInitialLoad) {
          setIsLoading(true);
        } else if (showLoading) {
          setIsRefreshing(true);
        }

        setError(null);

        // Check network connectivity first
        const isConnected = await checkNetworkConnection();
        if (!isConnected) {
          const networkError = {
            type: ERROR_TYPES.NETWORK,
            message: t('checkConnection')
          };
          setError(networkError.message);
          return [];
        }

        // Get current user
        const user = await getCurrentUser();
        if (!user) {
          const authError = {
            type: ERROR_TYPES.AUTH,
            message: t('pleaseLoginAgain')
          };
          setError(authError.message);
          return [];
        }

        const result = await getConversationsService();
        
        // The isMine flag is already correctly calculated in the message service
        // No need to override it here as it's based on the actual last message sender
        if (result && result.length > 0) {
          result.forEach(conv => {
            // Ensure isMine is properly set (should already be correct from service)
            if (typeof conv.isMine !== 'boolean') {
              // Fallback: determine from last message if isMine is not set
              const messages = conv.messages || [];
              const sortedMessages = [...messages].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
              const lastMsgObj = sortedMessages[0];
              conv.isMine = lastMsgObj ? lastMsgObj.sender_id === user.id : false;
            }
            
            // Debug logging for unread count and read status
            if (__DEV__) {
              const messages = conv.messages || [];
              const unreadMessages = messages.filter(msg => {
                // Use the same logic as the message service
                const readBy = Array.isArray(msg.read_by) ? msg.read_by : 
                              (typeof msg.read_by === 'string' ? JSON.parse(msg.read_by || '[]') : []);
                return msg.sender_id !== user.id && !readBy.includes(user.id);
              });
            }
          });
        }
        
        // Only update state if conversations have actually changed
        if (hasConversationsChanged(result)) {
          // Ensure isMine flags are preserved from the service
          const processedResult = result.map(conv => ({
            ...conv,
            isMine: conv.isMine // Preserve the original isMine value
          }));
          setConversations(processedResult);
          setFilteredConversations(processedResult);
        }

        const unreadCount = await getTotalUnreadConversations();
        setTotalUnreadConversations(unreadCount);

        return result;

      } catch (err) {
        logger.error('Failed to fetch conversations:', err);
        
        // Determine error type
        const errorType = 
          err.message?.includes('network') || err.message?.includes('connect') ? 
            ERROR_TYPES.NETWORK :
          err.code === ERROR_CODES.UNAUTHORIZED ? 
            ERROR_TYPES.AUTH :
            ERROR_TYPES.FETCH_CONVERSATIONS;

        const { message } = handleConversationsError(err, t, errorType);
        setError(message);
        setConversations([]);
        return [];
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsInitialLoad(false);
        isUpdating.current = false;
        
        // Check if there's a pending refresh
        if (pendingRefresh.current) {
          pendingRefresh.current = false;
          setTimeout(() => debouncedFetchConversations(false), 100);
        }
      }
    }, 100), // 100ms debounce for more responsive updates
    [setTotalUnreadConversations, t, isInitialLoad]
  );
  
  // Filter conversations based on search query
  const filterConversations = useCallback((query) => {
    if (!query.trim()) {
      setFilteredConversations(conversations);
      return;
    }
    
    const filtered = conversations.filter(conversation => {
      const username = conversation.otherUser?.username || '';
      const productName = conversation.product?.name || '';
      return username.toLowerCase().includes(query.toLowerCase()) ||
             productName.toLowerCase().includes(query.toLowerCase());
    });
    
    setFilteredConversations(filtered);
  }, [conversations]);

  // Handle search input change with debouncing
  const handleSearchChange = useCallback(
    debounce((text) => {
      setSearchQuery(text);
      filterConversations(text);
    }, 200),
    [filterConversations]
  );

  // Refresh conversations manually
  const handleRefresh = useCallback(() => {
    debouncedFetchConversations();
  }, [debouncedFetchConversations]);

  // Force refresh conversations (useful for debugging)
  const forceRefreshConversations = useCallback(async () => {
    try {
      await debouncedFetchConversations(false);
      
      // Update unread count
      const unreadCount = await getTotalUnreadConversations();
      setTotalUnreadConversations(unreadCount);
      

    } catch (error) {
      console.error('Error in force refresh:', error);
    }
  }, [debouncedFetchConversations, setTotalUnreadConversations]);

  // Retry function specifically for network errors
  const handleNetworkRetry = useCallback(async () => {
    try {

      setIsNetworkError(false);
      setIsCheckingAuth(true);
      
      // Just check network and retry auth check
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {

        setIsNetworkError(true);
        setIsCheckingAuth(false);
        return;
      }
      

      // Re-run the auth check (this will automatically fetch conversations if successful)
      const { user, isNetworkError: networkError, error } = await checkAuthenticationWithFallback();
      
      if (networkError) {

        setIsNetworkError(true);
        setIsAuthenticated(false);
      } else if (user) {

        setCurrentUserId(user.id);
        setIsAuthenticated(true);
        setIsNetworkError(false);
      } else {

        setIsAuthenticated(false);
        setIsNetworkError(false);
      }

    } catch (error) {

      setIsNetworkError(true);
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);
  
  // Updated subscription useEffect to handle real-time updates more effectively
  useEffect(() => {
    mounted.current = true;
    
    const unsubscribe = subscribeToConversations(async (update) => {
      if (!mounted.current) return;
      
      try {
        if (update.type === 'refresh') {
          if (update.data) {
            // Only update if conversations have actually changed
            if (hasConversationsChanged(update.data)) {
              // Ensure isMine flags are preserved from the service
              const processedData = update.data.map(conv => ({
                ...conv,
                isMine: conv.isMine // Preserve the original isMine value
              }));
              setConversations(processedData);
              setFilteredConversations(processedData);
            }
          } else {
            // Otherwise fetch them with debouncing
            debouncedFetchConversations(false);
          }

          // Update unread count
          const unreadCount = await getTotalUnreadConversations();
          setTotalUnreadConversations(unreadCount);
        }
      } catch (err) {
        handleConversationsError(err, t, ERROR_TYPES.SUBSCRIPTION);
      }
    });

    // Add real-time subscription for conversation updates
    const conversationUpdateChannel = supabase
      .channel('conversation-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: 'product_deleted=eq.true'
        },
        async (payload) => {
          if (!mounted.current) return;
          
          console.log('Conversation updated with product_deleted:', payload);
          
          // Refresh conversations when product_deleted is updated
          debouncedFetchConversations(false);
        }
      )
      .subscribe();

      // Listen for specific conversation updates
  const conversationUpdateListener = EventRegister.addEventListener('CONVERSATION_UPDATED', async (data) => {
    if (!mounted.current) return;
    
    try {
      // Only refresh if we have data and it's for a conversation we care about
      if (data && data.conversationId) {
        // Use debounced refresh to reduce flinching
        debouncedFetchConversations(false);
      }
    } catch (err) {
      console.error('Error handling conversation update:', err);
    }
  });

  // Listen for read status updates
  const readStatusUpdateListener = EventRegister.addEventListener('MESSAGES_MARKED_AS_READ', async (data) => {
    if (!mounted.current) return;
    
    try {
      // Immediately refresh conversations when messages are marked as read

      debouncedFetchConversations(false);
    } catch (err) {
      console.error('Error handling read status update:', err);
    }
  });

  // Listen for product deletion events
  const productDeletedListener = EventRegister.addEventListener('PRODUCT_DELETED', async (data) => {
    if (!mounted.current) return;
    
    try {
      console.log('Product deleted event received:', data);
      // Wait a moment for database update to complete, then refresh
      setTimeout(() => {
        if (mounted.current) {
          forceRefreshConversations(false);
        }
      }, 500);
    } catch (err) {
      console.error('Error handling product deletion event:', err);
    }
  });

    // Initial fetch
    debouncedFetchConversations(true);

    return () => {
      mounted.current = false;
      if (unsubscribe) unsubscribe();
      if (conversationUpdateChannel) {
        supabase.removeChannel(conversationUpdateChannel);
      }
      if (conversationUpdateListener) {
        EventRegister.removeEventListener(conversationUpdateListener);
      }
      if (readStatusUpdateListener) {
        EventRegister.removeEventListener(readStatusUpdateListener);
      }
      if (productDeletedListener) {
        EventRegister.removeEventListener(productDeletedListener);
      }
      // Clear avatar cache
      avatarUrlCache.current.clear();
    };
  }, [debouncedFetchConversations, setTotalUnreadConversations, t, hasConversationsChanged]);
  
  // Stronger refresh on screen focus - but with debouncing
  useFocusEffect(
    useCallback(() => {
      // Always refresh when screen comes into focus to ensure latest data

      debouncedFetchConversations(false);
      
      return () => {
        // This runs when the screen loses focus
      };
    }, [debouncedFetchConversations])
  );
  
  // Navigate to chat when a conversation is pressed
  const handleConversationPress = useCallback((conversation) => {
    // Allow navigation even for deleted users (they have id: null)
    if (!conversation?.otherUser) {
      console.log('No other user found in conversation');
      return;
    }

    // Prevent rapid navigation
    if (isUpdating.current) {
      return;
    }

    // Prepare product info if available
    let productInfo = null;
    if (conversation.product && conversation.product.id) {
      productInfo = {
        id: conversation.product.id,
        name: conversation.product.name,
        mainImage: conversation.product.image,
        type: conversation.product.type,
        price: conversation.product.price,
        dorm: conversation.product.dorm
      };
    }

    navigation.navigate('Chat', {
      conversationId: conversation.conversation_id,
      otherUserId: conversation.otherUser.id || null, // Allow null for deleted users
      otherUserName: conversation.otherUser.username || 'Deleted Account',
      productInfo: productInfo
    });
  }, [navigation]);
  
  
  // Helper function to get avatar URL with caching
  const avatarUrlCache = useRef(new Map());
  
  const getAvatarUrl = useCallback((url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    
    // Check cache first
    if (avatarUrlCache.current.has(url)) {
      return avatarUrlCache.current.get(url);
    }
    
    // Generate and cache URL
    const publicUrl = supabase.storage
      .from('avatars')
      .getPublicUrl(url)?.data?.publicUrl;
    
    avatarUrlCache.current.set(url, publicUrl);
    return publicUrl;
  }, []);

  // Render conversation item (supports both product-centric and legacy formats)
  const renderConversation = useCallback(({ item }) => {
    // Skip rendering if item is invalid
    if (!item || !item.conversation_id) {
      return null;
    }
    const isMyMessage = item.isMine;
    const isRead = item.lastMessageRead;
    
    
    // Check if this is the new product-centric format
    const isProductFormat = item.product && item.buyer && item.seller;
    
    
    
    if (isProductFormat) {
      // Product-centric conversation
      const productName = item.product?.is_deleted ? t('deletedProduct') : (item.product?.name || t('Unknown Product'));
      const productImage = item.product?.is_deleted ? null : item.product?.image;
      const productPrice = item.product?.price;
      const productType = item.product?.type;
      const isProductDeleted = item.product?.is_deleted;
      
      
      const buyerAvatar = getAvatarUrl(item.buyer?.avatar_url);
      const sellerAvatar = getAvatarUrl(item.seller?.avatar_url);
      
      const userRole = item.userRole;
      const otherUser = userRole === 'buyer' ? item.seller : item.buyer;
      const otherUserName = (otherUser?.is_deleted || otherUser?.username === 'Deleted Account') ? t('deletedAccount') : otherUser?.username;
      const isOtherUserDeleted = otherUser?.is_deleted || otherUser?.username === 'Deleted Account';

      return (
        <TouchableOpacity
          style={[
            styles.conversationItem,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
            item.unreadCount > 0 && { backgroundColor: colors.primary + '10' }
          ]}
          onPress={() => handleConversationPress(item)}
          activeOpacity={0.7}
        >
          {/* Product Image Container */}
          <View style={styles.productImageContainer}>
            {(isProductDeleted || isOtherUserDeleted || otherUser?.avatar_url === 'deleted_user_placeholder.png') ? (
              <Image
                source={require('../../assets/deleted_product_placeholder.webp')}
                style={styles.productImage}
              />
            ) : productImage ? (
              <Image
                source={{ 
                  uri: productImage,
                  cache: 'force-cache'
                }}
                style={styles.productImage}
                defaultSource={require('../../assets/placeholder.png')}
              />
            ) : (
              <View style={[styles.productImagePlaceholder, { backgroundColor: colors.surface }]}>
                <Ionicons 
                  name={productType === 'buy_order' ? "search" : "storefront"} 
                  size={24} 
                  color={colors.textSecondary} 
                />
              </View>
            )}
            
            {/* Product Type Badge */}
            <View style={[
              styles.productTypeBadge, 
              { backgroundColor: productType === 'buy_order' ? colors.secondary : colors.primary }
            ]}>
              <Text style={[styles.productTypeText, { color: colors.headerText }]}>
                {productType === 'buy_order' ? t('lookingFor') : t('sell')}
              </Text>
            </View>

            {/* Other User Avatar Only */}
            <View style={styles.participantAvatars}>
              <View style={styles.participantAvatarContainer}>
                {(isOtherUserDeleted || otherUser?.avatar_url === 'deleted_user_placeholder.png') ? (
                  <Image
                    source={require('../../assets/deleted_user_placeholder.png')}
                    style={[styles.participantAvatar, styles.otherUserAvatar]}
                  />
                ) : userRole === 'buyer' ? (
                  sellerAvatar ? (
                    <Image
                      source={{ uri: sellerAvatar }}
                      style={[styles.participantAvatar, styles.otherUserAvatar]}
                    />
                  ) : (
                    <View style={[styles.participantAvatarPlaceholder, styles.otherUserAvatar, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.participantAvatarText, { color: colors.headerText }]}>
                        {item.seller?.username?.charAt(0)?.toUpperCase() || t('Seller')}
                      </Text>
                    </View>
                  )
                ) : (
                  buyerAvatar ? (
                    <Image
                      source={{ uri: buyerAvatar }}
                      style={[styles.participantAvatar, styles.otherUserAvatar]}
                    />
                  ) : (
                    <View style={[styles.participantAvatarPlaceholder, styles.otherUserAvatar, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.participantAvatarText, { color: colors.headerText }]}>
                        {item.buyer?.username?.charAt(0)?.toUpperCase() || t('Buyer')}
                      </Text>
                    </View>
                  )
                )}
              </View>
            </View>
          </View>

          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <View style={styles.productInfo}>
                {/* Other User's Name (main title) */}
                <Text style={[
                  styles.userName,
                  { color: colors.text },
                  item.unreadCount > 0 && { fontWeight: '700' }
                ]} numberOfLines={1}>
                  {otherUserName}
                </Text>
                
                {/* Product Name (subtitle) */}
                <Text style={[
                  styles.productName,
                  { color: colors.textSecondary },
                  item.unreadCount > 0 && { fontWeight: '600' }
                ]} numberOfLines={1}>
                  {productName}
                </Text>
              </View>
              <View style={styles.timestampContainer}>
                <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                  {formatMessageTime(item.last_message_at, t)}
                </Text>
                <Text style={[styles.userRole, { color: colors.textSecondary }]}>
                  {t(userRole)}
                </Text>
                {productPrice && (
                  <Text style={[styles.productPrice, { color: colors.primary }]}>
                    ₽{productPrice}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.messageRow}>
              <Text 
                style={[
                  styles.lastMessage,
                  { color: colors.textSecondary },
                  item.unreadCount > 0 && { color: colors.text, fontWeight: '600' }
                ]} 
                numberOfLines={1}
              >
                {item.last_message 
                  ? (isMyMessage ? `${t('you')}: ${item.last_message}` : `${otherUserName}: ${item.last_message}`)
                  : ''
                }
              </Text>
              
              <View style={styles.messageStatus}>
                            {item.unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.unreadCount, { color: colors.headerText }]}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
                {isMyMessage && item.last_message && (
                  <Ionicons 
                    name={isRead ? "checkmark-done" : "checkmark"} 
                    size={14} 
                    color={isRead ? colors.primary : colors.textSecondary}
                    style={styles.readStatusIcon} 
                  />
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // Legacy user-to-user conversation - Show as product-centric layout
    const avatarUrl = item.otherUser?.avatar_url;
    const username = (item.otherUser?.is_deleted || item.otherUser?.username === 'Deleted Account') ? t('deletedAccount') : (item.otherUser?.username || t('Unknown User'));
    const isOtherUserDeleted = item.otherUser?.is_deleted || item.otherUser?.username === 'Deleted Account';

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
          item.unreadCount > 0 && { backgroundColor: colors.primary + '10' }
        ]}
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
      >
        {/* Product Image Container (using placeholder for legacy) */}
        <View style={styles.productImageContainer}>
          <View style={[styles.productImagePlaceholder, { backgroundColor: colors.surface }]}>
            <Ionicons 
              name="chatbubbles" 
              size={24} 
              color={colors.textSecondary} 
            />
          </View>
          
          {/* User Avatar (smaller, overlaid) */}
          <View style={styles.participantAvatars}>
            <View style={styles.participantAvatarContainer}>
              {(isOtherUserDeleted || item.otherUser?.avatar_url === 'deleted_user_placeholder.png') ? (
                <Image
                  source={require('../../assets/deleted_user_placeholder.png')}
                  style={[styles.participantAvatar, styles.buyerAvatar]}
                />
              ) : avatarUrl ? (
                <Image
                  source={{ 
                    uri: getAvatarUrl(avatarUrl),
                    cache: 'force-cache'
                  }}
                  style={[styles.participantAvatar, styles.buyerAvatar]}
                />
              ) : (
                <View style={[styles.participantAvatarPlaceholder, styles.buyerAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.participantAvatarText, { color: colors.headerText }]}>
                    {username.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <View style={styles.productInfo}>
              {/* User Name (main title) */}
              <Text style={[
                styles.userName,
                { color: colors.text },
                item.unreadCount > 0 && { fontWeight: '700' }
              ]} numberOfLines={1}>
                {username}
              </Text>
              
              {/* Legacy conversation indicator */}
              <Text style={[
                styles.productName,
                { color: colors.textSecondary },
                item.unreadCount > 0 && { fontWeight: '600' }
              ]} numberOfLines={1}>
                {t('Direct Message')}
              </Text>
            </View>
            <View style={styles.timestampContainer}>
              <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                {formatMessageTime(item.last_message_at, t)}
              </Text>
            </View>
          </View>

          <View style={styles.messageRow}>
            <Text 
              style={[
                styles.lastMessage,
                { color: colors.textSecondary },
                item.unreadCount > 0 && { color: colors.text, fontWeight: '600' }
              ]} 
              numberOfLines={1}
            >
              {item.last_message 
                ? (isMyMessage ? `${t('you')}: ${item.last_message}` : `${username}: ${item.last_message}`)
                : ''
              }
            </Text>
            
            <View style={styles.messageStatus}>
              {item.unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.unreadCount, { color: colors.headerText }]}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
              {isMyMessage && item.last_message && (
                <Ionicons 
                  name={isRead ? "checkmark-done" : "checkmark"} 
                  size={14} 
                  color={isRead ? colors.primary : colors.textSecondary}
                  style={styles.readStatusIcon} 
                />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [t, handleConversationPress, colors, getAvatarUrl]);

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('checkingAuthentication')}
        </Text>
      </View>
    );
  }

  // Show network error UI if network error
  if (isNetworkError) {
    return (
      <View style={[styles.signInPrompt, { backgroundColor: colors.background }]}>
        <View style={[styles.signInPromptContent, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <Ionicons name="wifi-outline" size={80} color={colors.error} />
          <Text style={[styles.signInPromptTitle, { color: colors.text }]}>{t('noInternet')}</Text>
          <Text style={[styles.signInPromptText, { color: colors.textSecondary }]}>
            {t('checkConnection')}
          </Text>
                      <TouchableOpacity
              style={[styles.signInPromptButton, { backgroundColor: colors.primary }]}
              onPress={handleNetworkRetry}
            >
              <Text style={[styles.signInPromptButtonText, { color: colors.headerText }]}>{t('retry')}</Text>
            </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <View style={[styles.signInPrompt, { backgroundColor: colors.background }]}>
        <View style={[styles.signInPromptContent, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <Ionicons name="chatbubbles-outline" size={80} color={colors.primary} />
          <Text style={[styles.signInPromptTitle, { color: colors.text }]}>{t('authenticationRequired')}</Text>
          <Text style={[styles.signInPromptText, { color: colors.textSecondary }]}>
            {t('signInToAccessMessages')}
          </Text>
          <TouchableOpacity
            style={[styles.signInPromptButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={[styles.signInPromptButtonText, { color: colors.headerText }]}>{t('signIn')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.signUpPromptButton, { backgroundColor: colors.secondary }]}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={[styles.signUpPromptButtonText, { color: colors.headerText }]}>{t('createAccount')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ErrorBoundaryWrapper
      onRetry={handleRefresh}
      loadingMessage={t('loadingConversations')}
      errorMessage={error || t('errorLoadingConversations')}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {isLoading && isInitialLoad ? (
          <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {t('loadingConversations')}
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <View style={[styles.searchInputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder={t('searchByUsername')}
                  placeholderTextColor={colors.placeholder}
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => {
                    setSearchQuery('');
                    setFilteredConversations(conversations);
                  }}>
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <FlatList
              data={filteredConversations}
              renderItem={renderConversation}
              keyExtractor={(item) => item.conversation_id || `conv-${item.last_message_at || Date.now()}`}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={10}
              initialNumToRender={10}
              contentContainerStyle={[
                styles.list,
                filteredConversations.length === 0 && styles.emptyList,
              ]}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
                title={t('pullToRefresh')}
                progressViewOffset={10}
                progressBackgroundColor={colors.background}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                {error ? (
                  <>
                    <Ionicons 
                      name={error.includes('internet') || error.includes('connection') 
                        ? "wifi-outline" 
                        : "alert-circle-outline"} 
                      size={60} 
                      color={colors.error} 
                    />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      {error.includes('internet') || error.includes('connection')
                        ? t('noInternet')
                        : t('errorTitle')}
                    </Text>
                    <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>{error}</Text>
                    <TouchableOpacity
                      style={[styles.refreshButton, { backgroundColor: colors.primary }]}
                      onPress={handleRefresh}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.refreshButtonText, { color: colors.headerText }]}>{t('retry')}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Ionicons name="chatbubbles-outline" size={60} color={colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('noConversations')}</Text>
                    <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                      {t('startChattingMessage')}
                    </Text>
                  </>
                )}
              </View>
            }
          />
           </>
        )}
      </View>
    </ErrorBoundaryWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  list: {
    flexGrow: 1,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 2,
    borderBottomWidth: 1,
  },
  temporaryConversation: {
    // This style is not used with theme colors, removing hardcoded color
  },
  // Product Image Styles
  productImageContainer: {
    width: 70,
    height: 70,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  productTypeBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productTypeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  // Participant Avatar Styles
  participantAvatars: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    flexDirection: 'row',
  },
  participantAvatarContainer: {
    marginLeft: -8,
  },
  participantAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  participantAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantAvatarText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  buyerAvatar: {
    // Buyer avatar appears first (left)
  },
  sellerAvatar: {
    // Seller avatar appears second (right)
  },
  otherUserAvatar: {
    // Other user avatar (only one shown)
  },
  // Legacy Avatar Styles (for backward compatibility)
  avatarContainer: {
    width: 50,
    height: 50,
    marginRight: 12,
    borderRadius: 25,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 16,
    paddingLeft: 6,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  productInfo: {
    flex: 1,
    marginRight: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  timestampContainer: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 12,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  messageStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    borderRadius: 8,
    minWidth: 16, // Smaller minimum width
    height: 16, // Smaller height
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4, // Smaller padding
  },
  unreadCount: {
    fontSize: 10, // Smaller font size
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: 24,
  },
  refreshButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 16,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  readStatusIcon: {
    marginLeft: 8,
  },
  signInPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  signInPromptContent: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
    maxWidth: 400,
  },
  signInPromptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  signInPromptText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  signInPromptButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
  },
  signInPromptButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  signUpPromptButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
  },
  signUpPromptButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ConversationsScreen;

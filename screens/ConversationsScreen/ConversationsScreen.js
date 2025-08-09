import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { UnreadContext } from '../../context/UnreadContext';
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

// Create logger for ConversationsScreen
const createLogger = (prefix) => ({
  // Only log errors by default
  log: (...args) => {
    // Uncomment for debugging
    // console.log(`[${prefix}]`, ...args);
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

const formatMessageTime = (dateString) => {
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
        hour12: true 
      });
    }
    
    // If message is from yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
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
  
  // State
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Get current user ID and check authentication
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setCurrentUserId(data.user.id);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Error getting current user:', err);
        setIsAuthenticated(false);
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
        backgroundColor: '#104d59',
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
        fontSize: 20,
      },
    });
  }, [navigation, t]);
  
  // Fetch conversations
  const fetchConversations = useCallback(async (showLoading = true) => {
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
      
      // Process conversations to add isMine flag based on last message sender
      if (result && result.length > 0) {
        result.forEach(conv => {
          // If there's an explicit last_message_sender_id field, use it
          if (conv.last_message_sender_id) {
            conv.isMine = conv.last_message_sender_id === user.id;
          } 
          // If there's a last_message_is_mine field, use it
          else if (typeof conv.last_message_is_mine === 'boolean') {
            conv.isMine = conv.last_message_is_mine;
          }
          // Fall back to trying to determine from conversation ID
          else {
            const [side1Id, side2Id] = (conv.conversation_id || '').split('_');
            conv.isMine = conv.last_message_side === 'user1' && side1Id === user.id ||
                          conv.last_message_side === 'user2' && side2Id === user.id;
          }
          
          // Log the read status for debugging
        });
      }
      
      setConversations(result);

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
    }
  }, [setTotalUnreadConversations, t, isInitialLoad]);
  
  // Refresh conversations manually
  const handleRefresh = useCallback(() => {
    fetchConversations();
  }, [fetchConversations]);
  
  // Updated subscription useEffect to handle real-time updates more effectively
  useEffect(() => {
    let mounted = true;
    
    const unsubscribe = subscribeToConversations(async (update) => {
      if (!mounted) return;
      
      try {
        if (update.type === 'refresh') {
          if (update.data) {
            // Update the conversations directly if we have the data
            setConversations(update.data);
          } else {
            // Otherwise fetch them
            await fetchConversations(false);
          }

          // Update unread count
          const unreadCount = await getTotalUnreadConversations();
          setTotalUnreadConversations(unreadCount);
        }
      } catch (err) {
        handleConversationsError(err, t, ERROR_TYPES.SUBSCRIPTION);
      }
    });

    // Initial fetch
    fetchConversations(true);

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [fetchConversations, setTotalUnreadConversations, t]);
  
  // Stronger refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      logger.log('Screen focused, refreshing conversations');
      
      // First do a quick update with no loading indicator
      fetchConversations(false);
      
      // Then trigger a full refresh including the backend
      triggerConversationsRefresh();
      
      return () => {
        // This runs when the screen loses focus
      };
    }, [fetchConversations])
  );
  
  // Navigate to chat when a conversation is pressed
  const handleConversationPress = useCallback((conversation) => {
    if (!conversation?.otherUser?.id) {
      console.error('Missing otherUser data:', conversation);
      return;
    }

    navigation.navigate('Chat', {
      conversationId: conversation.conversation_id,
      otherUserId: conversation.otherUser.id,
      otherUserName: conversation.otherUser.username
    });
  }, [navigation]);
  
  
  // Render a conversation item
  const renderConversation = useCallback(({ item }) => {
    const isMyMessage = item.isMine;
    const isRead = item.lastMessageRead;
    
    // Add debug log to understand the actual read status
    
    const avatarUrl = item.otherUser?.avatar_url;
    const username = item.otherUser?.username || t('Unknown User');
    
    const getAvatarUrl = (url) => {
      if (!url) return null;
      if (url.startsWith('http')) return url;
      return supabase.storage
        .from('avatars')
        .getPublicUrl(url)?.data?.publicUrl;
    };

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          item.unreadCount > 0 && styles.unreadConversation
        ]}
        onPress={() => handleConversationPress(item)}
      >
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image
              source={{ 
                uri: getAvatarUrl(avatarUrl),
                cache: 'force-cache'
              }}
              style={styles.avatar}
              defaultSource={require('../../assets/default-avatar.png')}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[
              styles.username,
              item.unreadCount > 0 && styles.unreadText
            ]} numberOfLines={1}>
              {username}
            </Text>
            <Text style={styles.timestamp}>
              {formatMessageTime(item.last_message_at)}
            </Text>
          </View>

          <View style={styles.messageRow}>
            <Text 
              style={[
                styles.lastMessage,
                item.unreadCount > 0 && styles.unreadText
              ]} 
              numberOfLines={1}
            >
              {isMyMessage ? `You: ${item.last_message}` : item.last_message}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unreadCount}
                </Text>
              </View>
            )}
            {isMyMessage && (
              <Ionicons 
                name={isRead === true ? "checkmark-done" : "checkmark"} 
                size={14} 
                color={isRead === true ? "#666" : "#999"}
                style={styles.readStatusIcon} 
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [t, handleConversationPress]);

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#ff5722" />
        <Text style={styles.loadingText}>
          {t('checkingAuthentication')}
        </Text>
      </View>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <View style={styles.signInPrompt}>
        <View style={styles.signInPromptContent}>
          <Ionicons name="chatbubbles-outline" size={80} color="#ff5722" />
          <Text style={styles.signInPromptTitle}>{t('Authentication Required')}</Text>
          <Text style={styles.signInPromptText}>
            {t('signInToAccessMessages')}
          </Text>
          <TouchableOpacity
            style={styles.signInPromptButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.signInPromptButtonText}>{t('Sign In')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.signUpPromptButton}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={styles.signUpPromptButtonText}>{t('Create Account')}</Text>
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
      <View style={styles.container}>
        {isLoading && isInitialLoad ? (
          <View style={styles.centeredContainer}>
            <ActivityIndicator size="large" color="#ff5722" />
            <Text style={styles.loadingText}>
              {t('loadingConversations')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item.conversation_id}
            contentContainerStyle={[
              styles.list,
              conversations.length === 0 && styles.emptyList,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={['#ff5722']}
                tintColor="#ff5722"
                title={t('pullToRefresh')}
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
                      color="#ff9800" 
                    />
                    <Text style={styles.emptyTitle}>
                      {error.includes('internet') || error.includes('connection')
                        ? t('noInternet')
                        : t('errorTitle')}
                    </Text>
                    <Text style={styles.emptyMessage}>{error}</Text>
                    <TouchableOpacity
                      style={styles.refreshButton}
                      onPress={handleRefresh}
                    >
                      <Text style={styles.refreshButtonText}>{t('retry')}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Ionicons name="chatbubbles-outline" size={60} color="#e0e0e0" />
                    <Text style={styles.emptyTitle}>{t('noConversations')}</Text>
                    <Text style={styles.emptyMessage}>
                      {t('startChattingMessage')}
                    </Text>
                  </>
                )}
              </View>
            }
          />
        )}
      </View>
    </ErrorBoundaryWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    color: '#666',
  },
  list: {
    flexGrow: 1,
    paddingTop: 8,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unreadConversation: {
    backgroundColor: '#fff9f7',
  },
  temporaryConversation: {
    backgroundColor: '#fbfbfb',
  },
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
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
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
    alignItems: 'center',
    marginBottom: 2,
  },
  username: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    fontWeight: '600',
    color: '#000',
  },
  unreadBadge: {
    backgroundColor: '#ff5722',
    borderRadius: 8,
    minWidth: 16, // Smaller minimum width
    height: 16, // Smaller height
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4, // Smaller padding
  },
  unreadCount: {
    color: '#fff',
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
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginHorizontal: 24,
  },
  refreshButton: {
    backgroundColor: '#ff5722',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 16,
  },
  refreshButtonText: {
    color: '#fff',
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
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  signInPromptContent: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    shadowColor: '#000',
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
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  signInPromptText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  signInPromptButton: {
    backgroundColor: '#ff5722',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
  },
  signInPromptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  signUpPromptButton: {
    backgroundColor: '#104d59',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
  },
  signUpPromptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ConversationsScreen;

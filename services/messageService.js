// messageService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase, { getUser, clearAllAuthTokens } from './supabaseConfig';
import { recordJwtError, handleMissingSubClaimError } from './authValidator';
import { EventRegister } from 'react-native-event-listeners';
import { withErrorHandling, AppError, ErrorTypes } from '../utils/errorHandler';
import { handleMessageError } from '../utils/messageErrorHandler';

// Error codes
const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Creates a logger for debugging purposes - minimized to reduce noise
 */
const logger = {
  error: (message, error) => {
    if (error?.message?.includes('Auth session missing')) return;
    console.error(message, error?.message || error);
  },
  info: (message, ...args) => {
    if (__DEV__) console.log(message, ...args);
  },
  warn: (message, ...args) => {
    if (__DEV__) console.warn(message, ...args);
  },
  log: (message, ...args) => {
    if (__DEV__) console.log(message, ...args);
  }
};

// Track if we've already shown the auth error to avoid spamming the logs
let authErrorShown = false;

/**
 * Check if there's a JWT-related error in the message
 * @param {string} errorMsg Error message to check
 * @returns {boolean} True if it's a JWT-related error
 */
const isJwtError = (errorMsg) => {
  if (!errorMsg) return false;
  
  return (
    errorMsg.includes('JWT') || 
    errorMsg.includes('token') ||
    errorMsg.includes('auth') ||
    errorMsg.includes('User from sub claim') ||
    errorMsg.includes('missing sub claim') ||
    errorMsg.includes('invalid claim')
  );
};

/**
 * Handle authentication errors by cleaning up tokens
 * @param {Error} error The error to handle
 */
const handleAuthError = async (error) => {
  // Skip logging auth session missing errors - they're normal before login
  if (error?.message?.includes('Auth session missing')) {
    return;
  }
  
  // Only log the first auth error to reduce noise
  if (!authErrorShown) {
    logger.error('Authentication error:', error);
    authErrorShown = true;
  }
  
  // Special handling for missing sub claim errors which are
  // particularly problematic and require immediate action
  if (error.message && (
      error.message.includes('missing sub claim') || 
      error.message.includes('invalid claim')
    )) {
    logger.warn('Critical JWT error detected (missing/invalid claim)');
    await handleMissingSubClaimError();
    return;
  }
  
  // Check if this is a JWT token error
  if (error.message && isJwtError(error.message)) {
    logger.warn('JWT token error detected, clearing auth state');
    // Record the error for handling on next app startup
    await recordJwtError(error);
    await clearAllAuthTokens();
  }
};

/**
 * Check if the user is authenticated before proceeding
 * @returns {Promise<Object|null>} User object or null
 */
const checkAuth = async () => {
  try {
    // First check if we've already logged the "missing sub claim" error
    const hasClaimError = await AsyncStorage.getItem('missing_sub_claim_error');
    if (hasClaimError === 'true') {
      if (!authErrorShown) {
        logger.warn('Skipping auth check due to known claim error');
        authErrorShown = true;
      }
      return null;
    }

    // Use v2 getUser API
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      // Special check for missing sub claim
      if (error.message && (
          error.message.includes('missing sub claim') ||
          error.message.includes('invalid claim')
        )) {
        // Record this so we don't keep trying the same failing request
        await AsyncStorage.setItem('missing_sub_claim_error', 'true');
      }
      
      await handleAuthError(error);
      return null;
    }

    // Clear the error flag since we succeeded
    await AsyncStorage.removeItem('missing_sub_claim_error');

    if (!data?.user) {
      if (!authErrorShown) {
        logger.warn('User is not authenticated');
        authErrorShown = true;
      }
      return null;
    }

    // Reset the error shown flag when we have a successful auth
    authErrorShown = false;
    return data.user;
  } catch (err) {
    // Check for missing sub claim in the error
    if (err.message && (
        err.message.includes('missing sub claim') ||
        err.message.includes('invalid claim')
      )) {
      // Record this so we don't keep trying the same failing request
      await AsyncStorage.setItem('missing_sub_claim_error', 'true');
    }
    
    await handleAuthError(err);
    return null;
  }
};

/**
 * Get current authenticated user
 * @returns {Promise<Object>} User object or null
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      // Don't throw for missing session during startup
      if (error.message?.includes('Auth session missing')) {
        return null;
      }
      logger.info('[Auth] Error:', error.message);
      return null;
    }

    if (!user) {
      logger.info('[Auth] No user found');
      return null;
    }

    return user;
  } catch (error) {
    logger.error('[Auth] getCurrentUser error:', error);
    return null;
  }
};

/**
 * Generates a conversation ID from two user IDs
 * @param {string} userId1 
 * @param {string} userId2 
 * @returns {string} Consistent conversation ID
 */
const generateConversationId = (userId1, userId2) => {
  return [userId1, userId2].sort().join('_');
};

/**
 * Find or create a conversation with another user
 * @param {string} otherUserId - The ID of the other user
 * @returns {Promise<Object>} Conversation object
 */
export const findOrCreateConversation = async (otherUserId) => {
  try {

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Create conversation ID by sorting user IDs
    const conversationId = [user.id, otherUserId].sort().join('_');

    // Check if conversation exists
    const { data: existing, error: fetchError } = await supabase
      .from('conversations')
      .select('conversation_id')
      .eq('conversation_id', conversationId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existing) {
      return existing;
    }

    // Create new conversation
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        conversation_id: conversationId,
        user1_id: user.id,
        user2_id: otherUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating conversation:', createError);
      throw createError;
    }

    return newConversation;

  } catch (error) {
    console.error('Failed to create conversation in database', error);
    throw error;
  }
};

/**
 * Cleans up temporary messages for a conversation
 * @param {string} conversationId - The conversation ID
 * @returns {Promise<void>}
 */
const cleanupTemporaryMessages = async (conversationId) => {
  try {
    // Get temp messages key
    const tempMessagesKey = `temp_messages_${conversationId}`;
    
    // Remove temporary messages from AsyncStorage
    await AsyncStorage.removeItem(tempMessagesKey);
    
    // Also clear any keys that might be related to this conversation 
    // but malformed due to earlier bugs
    const allKeys = await AsyncStorage.getAllKeys();
    const relatedTempKeys = allKeys.filter(key => 
      key.includes(conversationId) && key.includes('temp')
    );
    
    if (relatedTempKeys.length > 0) {
      await AsyncStorage.multiRemove(relatedTempKeys);
    }
  } catch (err) {
    logger.error('Error cleaning up temporary messages:', err);
  }
};

/**
 * Sends a message to a conversation
 * @param {string} conversationId 
 * @param {string} content Message content
 * @param {boolean} isTemporaryConversation Whether this is a temporary conversation
 * @returns {Promise<Object>} The sent message
 */
export const sendMessage = async (conversationId, content) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      is_read: false,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // Update conversation's last message
  await supabase
    .from('conversations')
    .update({
      last_message: content,
      last_message_at: new Date().toISOString()
    })
    .eq('conversation_id', conversationId);

  return message;
};

/**
 * Gets basic profile information for a user
 * @param {string} userId 
 * @returns {Promise<Object>} Basic profile info
 */
const getProfileBasicInfo = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Error fetching profile:', error);
      return { id: userId };
    }

    return data;
  } catch (err) {
    logger.error('Error getting profile info:', err);
    return { id: userId };
  }
};

/**
 * Updates the last message in a conversation
 * @param {string} conversationId 
 * @param {string} lastMessage 
 * @returns {Promise<boolean>} Success status
 */
const updateConversationLastMessage = async (conversationId, lastMessage) => {
  try {
    // Update in database
    const { error } = await supabase
      .from('conversations')
      .update({
        last_message: lastMessage,
        last_message_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId);

    if (error) {
      logger.error('Error updating conversation:', error);
      return false;
    }

    return true;
  } catch (err) {
    logger.error('Error updating conversation last message:', err);
    return false;
  }
};

/**
 * Gets messages from a conversation
 * @param {string} conversationId 
 * @param {number} limit Maximum number of messages to return
 * @returns {Promise<Array<Object>>} Array of message objects
 */
export const getMessages = async (conversationId) => {
  try {
    if (!conversationId) {
      return [];
    }

    const { data: messages, error } = await supabase
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
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return messages || [];
  } catch (error) {
    console.error('Error in getMessages:', error);
    return [];
  }
};

/**
 * Marks all messages in a conversation as read by the current user
 * @param {string} conversationId 
 * @param {string} userId
 * @returns {Promise<boolean>} Success status
 */
export const markMessagesAsRead = async (conversationId, userId) => {
  try {
    if (!conversationId || !userId) {
      return false;
    }
    
    // First fetch the messages that need to be marked as read
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .not('read_by', 'cs', `{${userId}}`);

    if (fetchError) {
      console.error('Error fetching messages to mark as read:', fetchError);
      return false;
    }

    if (!messages || messages.length === 0) {
      return true;
    }

    // Prepare updates including read_by array AND required fields
    const updates = messages.map(message => ({
      id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id, // Include sender_id which is required
      content: message.content,     // Include content which is required
      read_by: [...(message.read_by || []), userId].filter(Boolean), // Add current user to read_by array
      updated_at: new Date().toISOString()
    }));

    // Update messages with upsert
    const { error: updateError } = await supabase
      .from('messages')
      .upsert(updates, {
        onConflict: 'id',
        returning: 'minimal'
      });

    if (updateError) {
      console.error('Error updating message read status:', updateError);
      return false;
    }

    // Immediately trigger conversation update
    try {
      EventRegister.emit('REFRESH_CONVERSATIONS');
    } catch (err) {
      console.log('Error triggering refresh:', err);
    }

    return true;

  } catch (error) {
    console.error('Error in markMessagesAsRead:', error);
    return false;
  }
};

/**
 * Gets all conversations for the current user
 * @returns {Promise<Array<Object>>} Array of conversation objects
 */
export const getConversations = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    // Fetch conversations with messages
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select(`
        conversation_id,
        user1_id,
        user2_id,
        last_message,
        last_message_at,
        created_at,
        updated_at,
        messages (
          id,
          sender_id,
          content,
          read_by,
          created_at
        )
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return [];
    }

    // Get profiles for other users
    const otherUserIds = conversations.map(conv => 
      conv.user1_id === user.id ? conv.user2_id : conv.user1_id
    );

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', otherUserIds);

    const profileMap = (profiles || []).reduce((map, profile) => {
      map[profile.id] = profile;
      return map;
    }, {});

    return conversations.map(conv => {
      const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
      const otherUserProfile = profileMap[otherUserId] || {};
      const messages = conv.messages || [];

      // Sort messages by date and get the last one (already ordered? just ensure)
      const sortedMessages = [...messages].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const lastMsgObj = sortedMessages[0];

      // Count unread messages using read_by array
      const unreadCount = messages.filter(msg => 
        msg.sender_id !== user.id && 
        (!msg.read_by || !msg.read_by.includes(user.id))
      ).length;

      // Determine if last message was sent by current user
      const isMine = lastMsgObj ? lastMsgObj.sender_id === user.id : false;
      // Determine if last message sent by current user has been read by other user
      const lastMessageRead = isMine ? !!(lastMsgObj.read_by && lastMsgObj.read_by.includes(otherUserId)) : false;

      return {
        conversation_id: conv.conversation_id,
        last_message: conv.last_message || lastMsgObj?.content || '',
        last_message_at: conv.last_message_at || conv.created_at,
        unreadCount,
        isMine,
        lastMessageRead,
        otherUser: {
          id: otherUserId,
          username: otherUserProfile.username || 'Unknown User',
          avatar_url: otherUserProfile.avatar_url
        }
      };
    });

  } catch (error) {
    console.error('Error in getConversations:', error);
    throw error;
  }
};

/**
 * Gets the number of unread messages in a conversation
 * @param {string} conversationId 
 * @returns {Promise<number>} Number of unread messages
 */
const getUnreadCountForConversation = async (conversationId) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return 0;

    const { data, error } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .not('sender_id', 'eq', currentUser.id)
      .not('read_by', 'cs', `{${currentUser.id}}`);

    if (error) {
      logger.error('Error getting unread count:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (err) {
    logger.error('Error in getUnreadCountForConversation:', err);
    return 0;
  }
};

/**
 * Gets the total number of conversations with unread messages
 * @returns {Promise<number>} Number of conversations with unread messages
 */
export const getTotalUnreadConversations = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data: messages, error } = await supabase
      .from('messages')
      .select('conversation_id')
      .neq('sender_id', user.id)
      .not('read_by', 'cs', `{${user.id}}`);

    if (error) {
      console.error('Error getting unread conversations:', error);
      return 0;
    }

    // Get unique conversation IDs
    const unreadConversations = new Set(messages.map(m => m.conversation_id));
    return unreadConversations.size;

  } catch (error) {
    console.error('Error in getTotalUnreadConversations:', error);
    return 0;
  }
};

/**
 * Sets up a subscription to listen for new messages in a conversation
 * @param {string} conversationId 
 * @param {Function} callback Function to call when a new message is received
 * @returns {Function} Unsubscribe function
 */
const subscribeToMessages = (conversationId, callback) => {
  logger.info(`Setting up message subscription for conversation ${conversationId}`);
  
  if (!conversationId) {
    logger.error('Cannot subscribe to messages: Conversation ID is required');
    return () => {};
  }

  // First check if we know we have a claim error to avoid unnecessary subscription attempts
  AsyncStorage.getItem('missing_sub_claim_error')
    .then(hasClaimError => {
      if (hasClaimError === 'true') {
        logger.warn('Cannot set up subscription due to known claim error');
        // Clear the error flag so we can try again next time
        AsyncStorage.removeItem('missing_sub_claim_error')
          .catch(e => logger.error('Error clearing claim error flag:', e));
        return;
      }
      
      // Proceed with auth check if no known claim errors
      checkAuth().then(user => {
        if (!user) {
          logger.warn('Cannot set up realtime subscription: No authenticated user');
          return;
        }

        // Continue with subscription setup if authenticated
        setupMessageSubscription(conversationId, callback);
      }).catch(error => {
        logger.error('Error checking authentication before subscription:', error);
      });
    })
    .catch(error => {
      logger.error('Error checking for claim errors:', error);
    });

  // Return a placeholder unsubscribe function
  // The real one will be set up after auth check completes
  return () => {}; 
};

/**
 * Internal function to set up the subscription after auth check
 */
const setupMessageSubscription = (conversationId, callback) => {
  const channelName = `messages-${conversationId}-${Date.now()}`;
  
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const message = payload.new;
          
          // Fetch sender profile if needed
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', message.sender_id)
            .single();

          callback({
            ...message,
            sender: senderProfile,
            eventType: payload.eventType  // Include the event type so we can differentiate updates
          });
        }
      }
    )
    .subscribe((status, err) => {
      if (err) {
        console.error('Subscription error:', err);
      } else {
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Sets up a subscription to listen for conversation updates
 * @param {Function} callback Function to call when a conversation is updated
 * @returns {Function} Unsubscribe function
 */
export const subscribeToConversations = (callback) => {
  const refreshConversations = async () => {
    try {
      const conversations = await getConversations();
      callback({ type: 'refresh', data: conversations });
    } catch (err) {
      logger.error('Error refreshing conversations:', err);
    }
  };

  // Create unique channel name
  const channelName = `conversations-${Date.now()}`;

  // Clean up existing channels
  try {
    const existingChannels = supabase.getChannels();
    existingChannels.forEach(channel => {
      if (channel.topic.includes('conversations-')) {
        supabase.removeChannel(channel);
      }
    });
  } catch (err) {
    logger.error('Error cleaning up channels:', err);
  }

  // Set up the subscription
  try {
    // We need two channels: one for conversations and one for messages
    const conversationsChannel = supabase
      .channel(`${channelName}-convos`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          refreshConversations();
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(`${channelName}-msgs`)
      .on(
        'postgres_changes',
        {
          event: '*',  // Changed from 'INSERT' to '*' to catch updates
          schema: 'public',
          table: 'messages',
        },
        () => {
          // Refresh immediately when a message is updated/inserted
          refreshConversations();
        }
      )
      .subscribe();

    // Set up periodic refresh with a more frequent interval (5 seconds instead of 30)
    const intervalId = setInterval(refreshConversations, 5000);

    // Register a global event listener for immediate updates
    const refreshEventListener = EventRegister.addEventListener(
      'REFRESH_CONVERSATIONS', 
      refreshConversations
    );

    // Initial refresh
    refreshConversations();

    return () => {
      clearInterval(intervalId);
      EventRegister.removeEventListener(refreshEventListener);
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  } catch (err) {
    logger.error('Error setting up conversation subscription:', err);
    return () => {};
  }
};

/**
 * Trigger an immediate refresh of conversations
 * Use this when you need to update the conversation list immediately
 */
export const triggerConversationsRefresh = () => {
  EventRegister.emit('REFRESH_CONVERSATIONS');
};

/**
 * Clears all message data from AsyncStorage
 */
const clearAllMessageData = async () => {
  try {
    // Get all keys
    const allKeys = await AsyncStorage.getAllKeys();

    // Filter for message-related keys
    const messageKeys = allKeys.filter(key => 
      key.startsWith('temp_messages_') || 
      key.startsWith('message_') ||
      key === 'last_message_time'
    );

    if (messageKeys.length > 0) {
      // Remove all message-related keys
      await AsyncStorage.multiRemove(messageKeys);
    }

    return true;
  } catch (err) {
    logger.error('Error clearing message data:', err);
    return false;
  }
};

/**
 * Wrapper function for supabase calls to handle authentication errors consistently
 */
const safeSupabaseCall = async (operation) => {
  try {
    const user = await checkAuth();
    if (!user) {
      throw { code: ERROR_CODES.UNAUTHORIZED, message: 'You must be logged in' };
    }
    
    return await operation(user);
  } catch (error) {
    // Handle authentication errors
    if (error.message?.includes('auth') || error.message?.includes('JWT')) {
      await handleAuthError(error);
    }
    throw error;
  }
};

// Update authenticatedRequest to use v2 API
const authenticatedRequest = async (requestFn) => {
  try {
    // Try the request first
    return await requestFn();
  } catch (error) {
    // If we get an authentication error
    if (error.message?.includes('Authentication') || 
        error.message?.includes('UNAUTHORIZED') ||
        error.message?.includes('logged in') ||
        error.status === 401) {
      
      
      try {
        // Try to refresh the session
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('Session refresh failed:', refreshError);
          throw error; // Re-throw original error if refresh fails
        }
        
        
        // Retry the original request after refresh
        return await requestFn();
      } catch (refreshError) {
        console.error('Error during auth refresh:', refreshError);
        throw error; // Re-throw original error
      }
    }
    
    // For non-auth errors, just throw them
    throw error;
  }
};

// Helper for better error logging
const logError = (context, error) => {
  // Don't log as errors during background refreshes
  const isBackgroundRefresh = context.includes('refreshing');
  const logMethod = isBackgroundRefresh ? console.log : console.error;
  
  logMethod(`[MessageService] ${context}:`, error);
  return error; // Return the error for chaining
};

export const refreshConversations = async (silent = false) => {
  try {
    return await authenticatedRequest(async () => {
      const user = await getCurrentUser();
      if (!user) {
        throw { code: ERROR_CODES.UNAUTHORIZED, message: 'You must be logged in' };
      }
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            user_id,
            profiles(username, avatar_url)
          )
        `)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    });
  } catch (error) {
    // Don't log full error objects for silent refreshes
    const errorMsg = silent ? 'Background refresh failed' : 'Error refreshing conversations';
    
    if (silent) {
      console.log(`[MessageService] ${errorMsg}:`, error.message || error);
    } else {
      logError(errorMsg, error);
    }
    return [];
  }
};

export const initializeMessageService = () => {
  try {
    const channel = supabase.channel('messages');
    
    channel
      .on('error', (error) => {
        handleMessageError(error, 'subscription');
      })
      .on('disconnect', (error) => {
        handleMessageError(error, 'connection');
      })
      .subscribe(async (status, error) => {
        if (error) {
          handleMessageError(error, 'initialization');
        }
      });

  } catch (error) {
    handleMessageError(error, 'setup');
  }
};

export {
  subscribeToMessages,
  clearAllMessageData,
  ERROR_CODES
};
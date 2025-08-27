// messageService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase, { getUser, clearAllAuthTokens } from './supabaseConfig';
import { recordJwtError, handleMissingSubClaimError } from './authValidator';
import { EventRegister } from 'react-native-event-listeners';
import { withErrorHandling, AppError, ErrorTypes } from '../utils/errorHandler';
import { handleMessageError } from '../utils/messageErrorHandler';
import { canUsersInteract } from './blockingService';

// Push notification function
const sendPushNotificationForMessage = async (conversationId, senderId, messageContent) => {
  try {
    // Import notification service dynamically to avoid circular dependencies
    const notificationService = (await import('./notificationService')).default;
    
    // Check if notifications are enabled for the recipient
    const notificationsEnabled = await notificationService.areNotificationsEnabled();
    if (!notificationsEnabled) {
      logger.info('Notifications disabled by user preference');
      return;
    }

    // Get the other user's ID from the conversation
    let otherUserId;
    if (conversationId.startsWith('product_')) {
      // For product-centric conversations: product_{productId}_{buyerId}_{sellerId}
      const parts = conversationId.split('_');
      const buyerId = parts[2];
      const sellerId = parts[3];
      otherUserId = senderId === buyerId ? sellerId : buyerId;
    } else {
      // Legacy user-to-user conversations: user1_user2
      const [side1Id, side2Id] = conversationId.split('_');
      otherUserId = senderId === side1Id ? side2Id : side1Id;
    }

    // Get sender's profile info
    const senderProfile = await getProfileBasicInfo(senderId);
    const senderName = senderProfile?.username || 'Someone';

    // Truncate message content for notification
    const truncatedMessage = messageContent.length > 50 
      ? `${messageContent.substring(0, 47)}...` 
      : messageContent;

    // Call the Supabase Edge Function to send push notification
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          targetUserId: otherUserId,
          title: `New message from ${senderName}`,
          body: truncatedMessage,
          data: {
            type: 'message',
            conversationId: conversationId,
            otherUserId: senderId,
            messageContent: messageContent
          }
        }
      });

      if (error) {
        logger.error('Error calling push notification function:', error);
        return;
      }

      logger.info('Push notification sent successfully:', data);
    } catch (functionError) {
      logger.error('Edge function not available or failed:', functionError);
      // Don't fail the message send if notification fails
      return;
    }
  } catch (error) {
    logger.error('Error sending push notification:', error);
  }
};

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
 * Find or create a product-centric conversation
 * @param {Object} productInfo - Product information including id, name, type, etc.
 * @param {string} sellerId - The ID of the product seller/owner
 * @returns {Promise<Object>} Conversation object
 */
export const findOrCreateConversation = async (productInfo, sellerId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if users can interact (not blocked)
    const canInteract = await canUsersInteract(user.id, sellerId);
    if (!canInteract) {
      // Check which user blocked which to provide specific error
      const { data: currentUserBlockedOther } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', sellerId)
        .single();
      
      const { data: otherUserBlockedCurrent } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', sellerId)
        .eq('blocked_id', user.id)
        .single();
      
      if (currentUserBlockedOther) {
        throw new Error('YOU_BLOCKED_USER');
      } else if (otherUserBlockedCurrent) {
        throw new Error('USER_BLOCKED_YOU');
      } else {
        throw new Error('BLOCKED_USER');
      }
    }

    // Always create product-centric conversation ID: product_{productId}_{buyerId}_{sellerId}
    const conversationId = `product_${productInfo.id}_${user.id}_${sellerId}`;



    // Check if conversation already exists (try both formats)
    let existing = null;
    let fetchError = null;
    
    try {
      // First try product-centric format
      const { data, error } = await supabase
        .from('conversations')
        .select('conversation_id, product_id, product_name, product_image, buyer_id, seller_id')
        .eq('conversation_id', conversationId)
        .single();
      
      existing = data;
      fetchError = error;
      
      if (data) {

        return existing;
      }
    } catch (err) {
      if (err.code === '42703') {
        // Product-centric columns don't exist, try legacy format

        
        const legacyConversationId = [user.id, sellerId].sort().join('_');
        
        try {
          const { data, error } = await supabase
            .from('conversations')
            .select('conversation_id')
            .eq('conversation_id', legacyConversationId)
            .single();
          
          existing = data;
          fetchError = error;
          
          if (data) {

            return { ...data, conversation_id: legacyConversationId };
          }
        } catch (legacyErr) {
          fetchError = legacyErr;
        }
      } else {
        fetchError = err;
      }
    }

    // Only throw if it's not a "not found" error
    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // Try to create new product-centric conversation
    try {

      
      // Clean the mainImage URL if it's a full URL
      let cleanMainImage = productInfo.mainImage;
      if (cleanMainImage && cleanMainImage.startsWith('http')) {
        cleanMainImage = cleanMainImage.split('?')[0];
      }
      
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          conversation_id: conversationId,
          product_id: productInfo.id,
          product_name: productInfo.name,
          product_image: cleanMainImage,
          product_type: productInfo.type || 'product',
          product_price: productInfo.price || null,
          product_dorm: productInfo.dorm || null,
          buyer_id: user.id,
          seller_id: sellerId,
          participant_ids: [user.id, sellerId],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        if (createError.code === '23505') {
          // Duplicate key - conversation already exists, try to fetch it

          const { data: existingConv, error: fetchError } = await supabase
            .from('conversations')
            .select('*')
            .eq('conversation_id', conversationId)
            .single();
          
          if (fetchError) {
            throw fetchError;
          }
          

          return existingConv;
        }
        
        if (createError.code === '42703' || createError.code === '23502') {
          throw createError; // Will be caught by outer catch
        }
        throw createError;
      }


      return newConversation;
      
    } catch (createErr) {
      if (createErr.code === '42703' || createErr.code === '23502' || createErr.code === '42501') {
        // Product-centric structure failed, fall back to legacy

        
        const legacyConversationId = [user.id, sellerId].sort().join('_');
        
        const { data: legacyConversation, error: legacyError } = await supabase
          .from('conversations')
          .insert({
            conversation_id: legacyConversationId,
            user1_id: user.id,
            user2_id: sellerId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (legacyError) {
          if (legacyError.code === '23505') {
            // Duplicate key - conversation already exists, try to fetch it

            const { data: existingLegacyConv, error: fetchError } = await supabase
              .from('conversations')
              .select('*')
              .eq('conversation_id', legacyConversationId)
              .single();
            
            if (fetchError) {
              throw fetchError;
            }
            

            return existingLegacyConv;
          }
          
          console.error('Legacy conversation creation failed:', legacyError);
          throw legacyError;
        }
        

        return legacyConversation;
      }
      throw createErr;
    }

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

  // Get the other user's ID from the conversation
  let otherUserId;
  if (conversationId.startsWith('product_')) {
    // For product-centric conversations: product_{productId}_{buyerId}_{sellerId}
    const parts = conversationId.split('_');
    const buyerId = parts[2];
    const sellerId = parts[3];
    otherUserId = user.id === buyerId ? sellerId : buyerId;
  } else {
    // Legacy user-to-user conversations: user1_user2
    const [side1Id, side2Id] = conversationId.split('_');
    otherUserId = user.id === side1Id ? side2Id : side1Id;
  }

  // Check if users can interact (not blocked)
  const canInteract = await canUsersInteract(user.id, otherUserId);
  if (!canInteract) {
    // Check which user blocked which to provide specific error
    const { data: currentUserBlockedOther } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', otherUserId)
      .single();
    
    const { data: otherUserBlockedCurrent } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', otherUserId)
      .eq('blocked_id', user.id)
      .single();
    
    if (currentUserBlockedOther) {
      throw new Error('YOU_BLOCKED_USER');
    } else if (otherUserBlockedCurrent) {
      throw new Error('USER_BLOCKED_YOU');
    } else {
      throw new Error('BLOCKED_USER');
    }
  }

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

  if (error) {
    console.error('Error sending message:', error);
    throw error;
  }



  // Update conversation's last message (with error handling for legacy structure)
  try {
    await supabase
      .from('conversations')
      .update({
        last_message: content,
        last_message_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId);
  } catch (updateError) {
  }

  // Send push notification to the other user (with delay to ensure token is saved)
  try {
    // Add a small delay to ensure the token is properly saved
    setTimeout(async () => {
      await sendPushNotificationForMessage(conversationId, user.id, content);
    }, 1000);
  } catch (notificationError) {
    // Don't fail the message send if notification fails
    logger.error('Failed to send push notification:', notificationError);
  }

  return message;
};

/**
 * Gets basic profile information for a user
 * @param {string} userId 
 * @returns {Promise<Object>} Basic profile info
 */
const getProfileBasicInfo = async (userId) => {
  try {
    // If userId is null (deleted user), return deleted user info
    if (!userId) {
      return { 
        id: null, 
        username: 'Deleted Account', 
        avatar_url: 'deleted_user_placeholder.png',
        is_deleted: true 
      };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, user_deleted')
      .eq('id', userId)
      .single();

    if (error) {
      // If profile not found (deleted), return deleted user info
      if (error.code === 'PGRST116') {
        return { 
          id: null, 
          username: 'Deleted Account', 
          avatar_url: 'deleted_user_placeholder.png',
          is_deleted: true 
        };
      }
      logger.error('Error fetching profile:', error);
      return { id: userId };
    }

    // If user is marked as deleted, return deleted user info
    if (data?.user_deleted) {
      return { 
        id: null, 
        username: 'Deleted Account', 
        avatar_url: 'deleted_user_placeholder.png',
        is_deleted: true 
      };
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
        sender_deleted,
        content,
        read_by,
        created_at,
        profiles!sender_id (
          id,
          username,
          avatar_url,
          user_deleted
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    // Process messages to handle deleted users
    const processedMessages = (messages || []).map(message => {
      // If sender is deleted or sender_id is null, mark as deleted
      if (message.sender_deleted || !message.sender_id || message.profiles?.user_deleted) {
        return {
          ...message,
          sender_id: null,
          profiles: {
            id: null,
            username: 'Deleted Account',
            avatar_url: 'deleted_user_placeholder.png',
            is_deleted: true
          }
        };
      }
      return message;
    });

    return processedMessages;
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
      // Also trigger a more specific update for this conversation
      EventRegister.emit('CONVERSATION_UPDATED', { conversationId });
      // Trigger specific read status update
      EventRegister.emit('MESSAGES_MARKED_AS_READ', { conversationId });
    } catch (err) {
    }

    return true;

  } catch (error) {
    console.error('Error in markMessagesAsRead:', error);
    return false;
  }
};

/**
 * Gets all product-centric conversations for the current user
 * @returns {Promise<Array<Object>>} Array of conversation objects
 */
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

export const getConversations = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    // Try to fetch conversations with both formats
    let conversations = null;
    let conversationsError = null;
    let useLegacyFormat = false;
    
    try {
      // First try product-centric format
      const { data: productData, error: productError } = await supabase
        .from('conversations')
        .select(`
          conversation_id,
          product_id,
          product_name,
          product_image,
          product_type,
          product_price,
          product_dorm,
          product_deleted,
          buyer_id,
          seller_id,
          participant_ids,
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
        .contains('participant_ids', [user.id])
        .order('last_message_at', { ascending: false });
        
      if (productData && productData.length > 0) {
        conversations = productData;
        conversationsError = productError;
      } else {
        // No product-centric conversations found, try legacy format
        useLegacyFormat = true;
        
        const { data: legacyData, error: legacyError } = await supabase
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
          
        conversations = legacyData;
        conversationsError = legacyError;

      }
    } catch (err) {
      if (err.code === '42703') {
        // Product-centric columns don't exist, fall back to legacy

        useLegacyFormat = true;
        
        const { data, error } = await supabase
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
          
        conversations = data;
        conversationsError = error;
      } else {
        conversationsError = err;
      }
    }

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return [];
    }

    // Handle conversations based on format
    if (useLegacyFormat) {
      // Handle legacy user-to-user structure
      const otherUserIds = conversations.map(conv => 
        conv.user1_id === user.id ? conv.user2_id : conv.user1_id
      );

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, user_deleted')
        .in('id', otherUserIds);

      // Handle case where some profiles might be deleted
      const profileMap = {};
      if (profiles) {
        profiles.forEach(profile => {
          profileMap[profile.id] = profile;
        });
      }
      
      // For any user IDs not found in profiles (deleted), mark as deleted
      otherUserIds.forEach(userId => {
        if (!profileMap[userId]) {
          profileMap[userId] = {
            id: userId,
            username: 'Deleted Account',
            avatar_url: 'deleted_user_placeholder.png',
            user_deleted: true
          };
        }
      });

      return conversations.map(conv => {
        const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
        const otherUserProfile = profileMap[otherUserId] || {};
        const messages = conv.messages || [];

        const sortedMessages = [...messages].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const lastMsgObj = sortedMessages[0];

        const unreadCount = messages.filter(msg => {
          const readBy = parseReadBy(msg.read_by);
          return msg.sender_id !== user.id && !readBy.includes(user.id);
        }).length;

        const isMine = lastMsgObj ? lastMsgObj.sender_id === user.id : false;
        const lastMessageRead = isMine ? parseReadBy(lastMsgObj.read_by).includes(otherUserId) : false;

        // Handle deleted user
        const isOtherUserDeleted = otherUserProfile.user_deleted || !otherUserId;
        const otherUserData = isOtherUserDeleted ? {
          id: null,
          username: 'Deleted Account',
          avatar_url: 'deleted_user_placeholder.png',
          is_deleted: true
        } : {
          id: otherUserId,
          username: otherUserProfile.username || 'Unknown User',
          avatar_url: otherUserProfile.avatar_url
        };

        return {
          conversation_id: conv.conversation_id,
          last_message: conv.last_message || lastMsgObj?.content || '',
          last_message_at: conv.last_message_at || conv.created_at,
          unreadCount,
          isMine,
          lastMessageRead,
          // Legacy format compatibility
          otherUser: otherUserData
        };
      });
    } else {
      // Handle product-centric conversations
      const allParticipantIds = new Set();
      conversations.forEach(conv => {
        if (conv.buyer_id) allParticipantIds.add(conv.buyer_id);
        if (conv.seller_id) allParticipantIds.add(conv.seller_id);
      });

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, user_deleted')
        .in('id', Array.from(allParticipantIds));

      // Handle case where some profiles might be deleted
      const profileMap = {};
      if (profiles) {
        profiles.forEach(profile => {
          profileMap[profile.id] = profile;
        });
      }
      
      // For any user IDs not found in profiles (deleted), mark as deleted
      Array.from(allParticipantIds).forEach(userId => {
        if (!profileMap[userId]) {
          profileMap[userId] = {
            id: userId,
            username: 'Deleted Account',
            avatar_url: 'deleted_user_placeholder.png',
            user_deleted: true
          };
        }
      });



      return conversations.map(conv => {
        const messages = conv.messages || [];
        const otherUserId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
        const otherUserProfile = profileMap[otherUserId] || {};
        const buyerProfile = profileMap[conv.buyer_id] || {};
        const sellerProfile = profileMap[conv.seller_id] || {};

        // Handle deleted users
        const isBuyerDeleted = buyerProfile.user_deleted || !conv.buyer_id || conv.buyer_deleted;
        const isSellerDeleted = sellerProfile.user_deleted || !conv.seller_id || conv.seller_deleted;
        const isOtherUserDeleted = otherUserProfile.user_deleted || !otherUserId;

        const sortedMessages = [...messages].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const lastMsgObj = sortedMessages[0];

        const unreadCount = messages.filter(msg => {
          const readBy = parseReadBy(msg.read_by);
          return msg.sender_id !== user.id && !readBy.includes(user.id);
        }).length;

        const isMine = lastMsgObj ? lastMsgObj.sender_id === user.id : false;
        const lastMessageRead = isMine ? parseReadBy(lastMsgObj.read_by).includes(otherUserId) : false;

        let productImageUrl = null;
        if (conv.product_image) {
          if (conv.product_image.startsWith('http')) {
            // Remove any cache-busting parameters for consistency
            productImageUrl = conv.product_image.split('?')[0];
          } else {
            // Try to get the public URL from the appropriate bucket
            const bucket = conv.product_type === 'buy_order' ? 'buy-orders-images' : 'product_images';
            try {
              const publicUrl = supabase.storage.from(bucket).getPublicUrl(conv.product_image);
              productImageUrl = publicUrl?.data?.publicUrl || null;
            } catch (error) {
              console.error('Error generating product image URL:', error);
              productImageUrl = null;
            }
          }
        }

        // Check if product is deleted (handle missing column gracefully)
        let isProductDeleted = (conv.product_deleted !== undefined ? conv.product_deleted : false);
        
        // For hard-deleted products, we rely on the product_deleted flag
        // The deleteProduct function will set product_deleted = true when product is hard deleted
        
        
        const productData = {
          id: conv.product_id,
          name: isProductDeleted ? 'Deleted Item' : (conv.product_name || 'Unknown Product'),
          image: isProductDeleted ? null : productImageUrl,
          type: conv.product_type,
          price: conv.product_price,
          dorm: conv.product_dorm,
          is_deleted: isProductDeleted
        };
        

        
        return {
          conversation_id: conv.conversation_id,
          last_message: conv.last_message || lastMsgObj?.content || '',
          last_message_at: conv.last_message_at || conv.created_at,
          unreadCount,
          isMine,
          lastMessageRead,
          product: productData,
          buyer: isBuyerDeleted ? {
            id: null,
            username: 'Deleted Account',
            avatar_url: 'deleted_user_placeholder.png',
            is_deleted: true
          } : {
            id: conv.buyer_id,
            username: buyerProfile.username || 'Unknown User',
            avatar_url: buyerProfile.avatar_url
          },
          seller: isSellerDeleted ? {
            id: null,
            username: 'Deleted Account',
            avatar_url: 'deleted_user_placeholder.png',
            is_deleted: true
          } : {
            id: conv.seller_id,
            username: sellerProfile.username || 'Unknown User',
            avatar_url: sellerProfile.avatar_url
          },
          otherUser: isOtherUserDeleted ? {
            id: null,
            username: 'Deleted Account',
            avatar_url: 'deleted_user_placeholder.png',
            is_deleted: true
          } : {
            id: otherUserId,
            username: otherUserProfile.username || 'Unknown User',
            avatar_url: otherUserProfile.avatar_url
          },
          userRole: conv.buyer_id === user.id ? 'buyer' : 'seller'
        };
      });
    }

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
  let lastRefreshTime = 0;
  const MIN_REFRESH_INTERVAL = 500; // Minimum 500ms between refreshes for more responsive updates
  
  const refreshConversations = async () => {
    try {
      const now = Date.now();
      if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
        // Skip refresh if too soon
        return;
      }
      lastRefreshTime = now;
      
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

    // Set up periodic refresh with a less frequent interval (15 seconds instead of 5)
    const intervalId = setInterval(refreshConversations, 15000);

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

// Add a function to force refresh conversations
export const forceRefreshConversations = async () => {
  try {
    const conversations = await getConversations();
    EventRegister.emit('REFRESH_CONVERSATIONS', { 
      timestamp: Date.now(),
      data: conversations 
    });
    return conversations;
  } catch (error) {
    console.error('Error in force refresh:', error);
    throw error;
  }
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
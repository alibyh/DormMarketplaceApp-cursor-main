// context/UnreadContext.js

import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getTotalUnreadConversations } from '../services/messageService';
import supabase from '../services/supabaseConfig';
import { EventRegister } from 'react-native-event-listeners';

// Create logger for UnreadContext
const createLogger = (prefix) => ({
  // Only enable regular logs when needed for debugging
  log: (...args) => {}, // Disabled routine logs
  error: (...args) => console.error(`[${prefix}] ERROR:`, ...args),
});

const logger = createLogger('UnreadContext');

export const UnreadContext = createContext();

export const UnreadProvider = ({ children }) => {
  const [totalUnreadConversations, setTotalUnreadConversations] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Add this new function to handle unread count updates
  const updateUnreadCount = useCallback(async () => {
    try {
      if (!isAuthenticated) {
        setTotalUnreadConversations(0);
        return;
      }

      const count = await getTotalUnreadConversations();
      setTotalUnreadConversations(count);
    } catch (error) {
      logger.error('Error updating unread count:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Set up realtime subscription for messages
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          updateUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, updateUnreadCount]);

  // Update auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const isLoggedIn = !!session?.user;
      setIsAuthenticated(isLoggedIn);
      
      if (!isLoggedIn) {
        setTotalUnreadConversations(0);
      } else {
        updateUnreadCount();
      }
    });

    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      const isLoggedIn = !!session?.user;
      setIsAuthenticated(isLoggedIn);
      if (isLoggedIn) {
        updateUnreadCount();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [updateUnreadCount]);

  useEffect(() => {
    // Subscribe to unread count changes
    const listener = EventRegister.addEventListener(
      'unread-count-changed',
      () => {
        updateUnreadCount();
      }
    );

    return () => {
      // Cleanup listener
      EventRegister.removeEventListener(listener);
    };
  }, [updateUnreadCount]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        await updateUnreadCount();
      } catch (error) {
        logger.error('Error initializing unread count:', error.message);
      } finally {
        if (mounted) {
          setIsInitialized(true);
        }
      }
    };

    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, () => {
        if (mounted) {
          updateUnreadCount();
        }
      })
      .subscribe();

    initialize();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [updateUnreadCount]);

  const contextValue = {
    totalUnreadConversations,
    setTotalUnreadConversations,
    isAuthenticated,
    refreshUnreadCount: updateUnreadCount,
    isInitialized,
    isLoading,
  };

  return (
    <UnreadContext.Provider value={contextValue}>
      {children}
    </UnreadContext.Provider>
  );
};

// Update the markMessagesAsRead function in messageService.js

export const markMessagesAsRead = async (conversationId) => {
  try {
    const currentUser = await supabase.auth.getUser();
    if (!currentUser?.data?.user?.id) {
      throw new Error('No authenticated user');
    }

    const userId = currentUser.data.user.id;

    // Get unread messages for this conversation
    const { data: unreadMessages, error: fetchError } = await supabase
      .from('messages')
      .select('id, read_by')
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId) // Only mark messages from other users
      .not('read_by', 'cs', `{${userId}}`); // Not already read by current user

    if (fetchError) {
      console.error('Error fetching unread messages:', fetchError);
      return 0;
    }

    if (!unreadMessages || unreadMessages.length === 0) {
      return 0;
    }

    // Update read status for each message
    const updatePromises = unreadMessages.map(message => {
      const currentReadBy = Array.isArray(message.read_by) ? message.read_by : [];
      const newReadBy = [...new Set([...currentReadBy, userId])];

      return supabase
        .from('messages')
        .update({ read_by: newReadBy })
        .eq('id', message.id);
    });

    await Promise.all(updatePromises);

    // Emit event for unread count update using React Native event emitter
    EventRegister.emit('unread-count-changed');

    return unreadMessages.length;
  } catch (error) {
    console.error('Error in markMessagesAsRead:', error);
    return 0;
  }
};


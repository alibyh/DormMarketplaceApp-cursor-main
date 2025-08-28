import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from './supabaseConfig';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.isInitialized = false;
  }

  // Initialize the notification service
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {

        return false;
      }

      // Get the token
      if (Device.isDevice) {
        console.log('Getting Expo push token...');
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: 'b9355317-1a5b-4df9-967f-ec3b425294f6', // Your Expo project ID
        });
        this.expoPushToken = token.data;
        console.log('Expo push token received:', this.expoPushToken);

        // Save token to AsyncStorage
        await AsyncStorage.setItem('expoPushToken', this.expoPushToken);

        // Save token to Supabase
        await this.saveTokenToSupabase(this.expoPushToken);
      } else {
        console.log('Not running on a device, skipping push token');
      }

      // Set up notification listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  // Save push token to Supabase
  async saveTokenToSupabase(token) {
    try {
      console.log('Saving push token to Supabase:', token);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, skipping token save');
        return;
      }

      // First, check if this token already exists for this user
      const { data: existingToken } = await supabase
        .from('user_push_tokens')
        .select('id')
        .eq('user_id', user.id)
        .eq('push_token', token)
        .single();

      if (existingToken) {
        // Token already exists, just update the timestamp
        const { error } = await supabase
          .from('user_push_tokens')
          .update({
            updated_at: new Date().toISOString(),
            is_active: true
          })
          .eq('id', existingToken.id);

        if (error) {
          console.error('Error updating push token:', error);
        } else {
        }
      } else {
        // Token doesn't exist, insert new record
        const { error } = await supabase
          .from('user_push_tokens')
          .insert({
            user_id: user.id,
            push_token: token,
            device_type: Platform.OS,
            is_active: true,
            updated_at: new Date().toISOString(),
          });

        if (error) {
          console.error('Error saving push token to Supabase:', error);
        } else {
          console.log('Push token saved to Supabase successfully');
        }
      }
    } catch (error) {
      console.error('Error in saveTokenToSupabase:', error);
    }
  }

  // Check if notifications are enabled for the user
  async areNotificationsEnabled() {
    try {
      const value = await AsyncStorage.getItem('messageNotificationsEnabled');
      return value !== 'false'; // Default to true if not set
    } catch (error) {
      console.error('Error checking notification preferences:', error);
      return true; // Default to true on error
    }
  }

  // Set up notification listeners
  setupNotificationListeners() {
    // Listen for incoming notifications when app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      this.handleForegroundNotification(notification);
    });

    // Listen for notification responses (when user taps notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      this.handleNotificationResponse(response);
    });
  }

  // Handle foreground notifications
  handleForegroundNotification(notification) {
    const { title, body, data } = notification.request.content;
    
    // You can show a custom in-app notification here
    // For now, we'll just log it
  }

  // Handle notification responses (when user taps notification)
  handleNotificationResponse(response) {
    const { title, body, data } = response.notification.request.content;
    
    // Handle navigation based on notification type
    if (data?.type === 'message') {
      // Navigate to chat screen
      this.navigateToChat(data.conversationId, data.otherUserId);
    }
  }

  // Navigate to chat screen (this will be called from the main app)
  navigateToChat(conversationId, otherUserId) {
    // This will be implemented in the main app component
    // We'll use a callback or event system
    if (global.navigationRef?.current) {
      global.navigationRef.current.navigate('Chat', {
        conversationId,
        otherUserId,
      });
    }
  }

  // Send a local notification (for testing)
  async sendLocalNotification(title, body, data = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null, // Send immediately
    });
  }

  // Get the current push token
  async getPushToken() {
    if (!this.expoPushToken) {
      this.expoPushToken = await AsyncStorage.getItem('expoPushToken');
    }
    return this.expoPushToken;
  }

  // Manually save token (useful when user logs in)
  async saveCurrentToken() {
    const token = await this.getPushToken();
    if (token) {
      try {
        await this.saveTokenToSupabase(token);
        
        // Debug: Check if token was actually saved
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: savedTokens } = await supabase
            .from('user_push_tokens')
            .select('push_token, is_active')
            .eq('user_id', user.id);
        }
      } catch (error) {
        console.error('Error saving token:', error);
      }
    } else {
      console.log('No token available to save');
    }
  }

  // Activate all tokens for current user (useful for debugging)
  async activateAllTokens() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_push_tokens')
        .update({ is_active: true })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error activating tokens:', error);
      } else {
      }
    } catch (error) {
      console.error('Error in activateAllTokens:', error);
    }
  }

  // Update badge count
  async setBadgeCount(count) {
    await Notifications.setBadgeCountAsync(count);
  }

  // Clear all notifications
  async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  }

  // Clean up listeners
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

// Create a singleton instance
const notificationService = new NotificationService();

export default notificationService; 
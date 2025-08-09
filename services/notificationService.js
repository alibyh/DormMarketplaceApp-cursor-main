import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notifications defaults
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register for push notifications
export const registerForPushNotifications = async () => {
  let token;
  
  if (Constants.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;
  } else {
    //console.log('Must use physical device for push notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF5722',
    });
  }

  return token;
};

// Send a local notification for a new message
export const sendMessageNotification = async (senderName, messageText) => {
  // Check if notifications are enabled
  const notificationsEnabled = await AsyncStorage.getItem('messageNotificationsEnabled');
  if (notificationsEnabled === 'false') return;
  
  const truncatedMessage = messageText.length > 50 
    ? `${messageText.substring(0, 47)}...` 
    : messageText;
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `New message from ${senderName}`,
      body: truncatedMessage,
      data: { type: 'message' },
    },
    trigger: null, // Send immediately
  });
};

// Show notification for when a conversation is started
export const sendNewConversationNotification = async (senderName) => {
  // Check if notifications are enabled
  const notificationsEnabled = await AsyncStorage.getItem('messageNotificationsEnabled');
  if (notificationsEnabled === 'false') return;
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New Conversation',
      body: `${senderName} has started a conversation with you`,
      data: { type: 'conversation' },
    },
    trigger: null, // Send immediately
  });
};

// Set notification badge count
export const setBadgeCount = async (count) => {
  await Notifications.setBadgeCountAsync(count);
};

// Enable/disable message notifications
export const setMessageNotificationsEnabled = async (enabled) => {
  await AsyncStorage.setItem('messageNotificationsEnabled', enabled ? 'true' : 'false');
};

// Check if message notifications are enabled
export const areMessageNotificationsEnabled = async () => {
  const value = await AsyncStorage.getItem('messageNotificationsEnabled');
  return value !== 'false'; // Default to true if not set
};

// Add a listener for handling notifications
export const addNotificationListener = (callback) => {
  const subscription = Notifications.addNotificationResponseReceivedListener(callback);
  return subscription;
}; 
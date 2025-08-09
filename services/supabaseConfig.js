// Simplified supabaseConfig.js that uses the working auth flow
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleDatabaseError } from '../utils/databaseErrorHandler';

// Use the exact same URL and key that worked in the direct API call
const SUPABASE_URL = 'https://hiqscrnxzgotgieihnzh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpcXNjcm54emdvdGdpZWlobnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5NDg3NDYsImV4cCI6MjA1OTUyNDc0Nn0.YP-4RO401mp_6qU39Sw0iCnmLHtqyjAp6wIEnU8_z6E';
// Create minimal client without any extra configurations that could cause issues
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  storage: {
    // Enable storage debugging
    debug: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  db: {
    onError: (error) => {
      handleDatabaseError(error);
    }
  }
});

// Manually set the session using the direct API approach
export const manuallySetSession = async (accessToken, refreshToken, user) => {
  try {
    console.log('Manually setting session...');
    
    // Store session details in AsyncStorage
    const sessionData = {
      access_token: accessToken, 
      refresh_token: refreshToken,
      user: user
    };
    
    await AsyncStorage.setItem('supabase.auth.token', JSON.stringify(sessionData));
    
    console.log('Session manually set successfully');
    return true;
  } catch (error) {
    console.error('Error manually setting session:', error);
    return false;
  }
};

// Helper function to get user (without relying on the failing client methods)
export const getUser = async () => {
  try {
    // Try to get user data from AsyncStorage first
    const sessionJson = await AsyncStorage.getItem('supabase.auth.token');
    if (sessionJson) {
      const sessionData = JSON.parse(sessionJson);
      return sessionData.user;
    }
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

// Other helper functions
export const clearAllAuthTokens = async () => {
  try {
    await AsyncStorage.removeItem('supabase.auth.token');
    return true;
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
    return false;
  }
};

export const validateAuthToken = async () => {
  try {
    const sessionJson = await AsyncStorage.getItem('supabase.auth.token');
    return Boolean(sessionJson);
  } catch (error) {
    console.error('Error validating auth token:', error);
    return false;
  }
};

export const verifyAuthState = async () => {
  return validateAuthToken();
};

export const initializeSupabase = async () => {
  try {
    const { error } = await supabase.auth.initialize();
    if (error) throw error;
  } catch (error) {
    handleDatabaseError(error, 'initialization');
  }
};

export { SUPABASE_URL, SUPABASE_ANON_KEY };
export default supabase;
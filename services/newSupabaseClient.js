import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-get-random-values';

// First, we'll clear ALL AsyncStorage as a desperate measure
const clearAllStorage = async () => {
  try {
    console.log('[CRITICAL] Performing emergency AsyncStorage clear');
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);
    console.log('[CRITICAL] All storage cleared successfully');
    return true;
  } catch (e) {
    console.error('[CRITICAL] Error clearing storage:', e);
    return false;
  }
};

// This will be our new supabase client, initialized after storage clear
let supabase = null;

// Create the client after storage is cleared
const initializeSupabase = async () => {
  // Clear all storage first
  await clearAllStorage();
  
  // Your Supabase credentials
  const supabaseUrl = 'https://hiqscrnxzgotgieihnzh.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpcXNjcm54emdvdGdpZWlobnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5NDg3NDYsImV4cCI6MjA1OTUyNDc0Nn0.YP-4RO401mp_6qU39Sw0iCnmLHtqyjAp6wIEnU8_z6E';
  
  // Completely new storage key
  const uniqueKey = `supabase-${Math.random().toString(36).substring(2, 15)}`;
  
  // Create minimal client with bare essentials
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      // Use a super minimal configuration
      storage: AsyncStorage,
      storageKey: uniqueKey,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  });
  
  console.log('[CRITICAL] New Supabase client created with fresh storage');
  return supabase;
};

// Export a function to get the client
export const getSupabaseClient = async () => {
  if (!supabase) {
    // Initialize if not already done
    await initializeSupabase();
  }
  return supabase;
};

// Initialize immediately
initializeSupabase(); 
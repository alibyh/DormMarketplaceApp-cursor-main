import { checkNetworkConnection } from './networkUtils';
import supabase from '../services/supabaseConfig';

/**
 * Enhanced authentication check that handles network errors gracefully
 * @returns {Promise<{user: Object|null, isNetworkError: boolean, error: Error|null}>}
 */
export const checkAuthenticationWithNetworkHandling = async () => {
  try {
    // First check network connectivity
    const isConnected = await checkNetworkConnection();
    if (!isConnected) {
      return {
        user: null,
        isNetworkError: true,
        error: new Error('No internet connection')
      };
    }

    // Try to get user with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 10000)
    );

    const authPromise = supabase.auth.getUser();
    
    const { data, error } = await Promise.race([authPromise, timeoutPromise]);

    if (error) {
      // Check if it's a network-related error
      if (error.message?.includes('network') || 
          error.message?.includes('fetch') ||
          error.message?.includes('timeout') ||
          error.message?.includes('connection')) {
        return {
          user: null,
          isNetworkError: true,
          error: error
        };
      }
      
      // It's a real authentication error
      return {
        user: null,
        isNetworkError: false,
        error: error
      };
    }

    return {
      user: data?.user || null,
      isNetworkError: false,
      error: null
    };

  } catch (error) {
    // Check if it's a network-related error
    if (error.message?.includes('network') || 
        error.message?.includes('fetch') ||
        error.message?.includes('timeout') ||
        error.message?.includes('connection') ||
        error.message?.includes('Request timeout')) {
      return {
        user: null,
        isNetworkError: true,
        error: error
      };
    }
    
    return {
      user: null,
      isNetworkError: false,
      error: error
    };
  }
};

/**
 * Check if user is authenticated, with fallback to cached session
 * @returns {Promise<{user: Object|null, isNetworkError: boolean, error: Error|null}>}
 */
export const checkAuthenticationWithFallback = async () => {
  const result = await checkAuthenticationWithNetworkHandling();
  
  // If it's a network error, try to get cached session
  if (result.isNetworkError) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        return {
          user: data.session.user,
          isNetworkError: true, // Still network error, but we have cached user
          error: result.error
        };
      }
    } catch (fallbackError) {
      console.log('Fallback session check failed:', fallbackError);
    }
  }
  
  return result;
};

// authValidator.js
// This file contains functions to validate auth tokens on app startup
import { validateAuthToken, clearAllAuthTokens } from './supabaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Disable most logging by default
const VERBOSE_LOGGING = false;

// Helper function to conditionally log
const log = (message) => {
  if (VERBOSE_LOGGING) {
    console.log(message);
  }
};

const error = (...args) => console.error(...args);

/**
 * Validates the current authentication token and clears it if invalid
 * Should be called on app startup to prevent JWT authentication errors
 */
export const validateAuthOnStartup = async () => {
  log('[AuthValidator] Starting auth validation on app startup');
  
  try {
    // Check for JWT-related error flags
    const hasJwtError = await AsyncStorage.getItem('auth_jwt_error');
    
    if (hasJwtError === 'true') {
      log('[AuthValidator] Previous JWT error detected, clearing tokens');
      await clearAllAuthTokens();
      await AsyncStorage.removeItem('auth_jwt_error');
    }
    
    // Verify there are no stale tokens or corrupted tokens that might cause issues
    const checkedForCorruptedTokens = await checkForCorruptedTokens();
    if (checkedForCorruptedTokens) {
      log('[AuthValidator] Cleaned up potentially corrupted tokens');
    }
    
    // Validate the current token
    const isValid = await validateAuthToken();
    
    if (!isValid) {
      log('[AuthValidator] Invalid token detected during startup, cleared auth state');
      // Already cleared in validateAuthToken
    } else {
      log('[AuthValidator] Token validated successfully');
    }
    
    return isValid;
  } catch (error) {
    // Keep error logging but filter out auth session missing
    if (!error.message?.includes('Auth session missing')) {
      console.error('Error during auth validation:', error);
    }
    return false;
  }
};

/**
 * Checks for corrupted or malformed tokens and cleans them up
 * @returns {Promise<boolean>} True if any tokens were cleaned up
 */
export const checkForCorruptedTokens = async () => {
  try {
    // Get all keys in AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Look for auth-related keys
    const authKeys = allKeys.filter(key => 
      key.includes('auth') || 
      key.includes('supabase') || 
      key.includes('token') ||
      key.includes('session')
    );
    
    if (authKeys.length === 0) {
      return false; // No auth keys to check
    }
    
    // Get all the values for these keys
    const keyValues = await AsyncStorage.multiGet(authKeys);
    let hasCleanedTokens = false;
    
    // Check each value for potentially corrupted tokens
    const keysToRemove = [];
    for (const [key, value] of keyValues) {
      if (!value) continue;
      
      try {
        // Try to parse values that should be JSON
        if (value.startsWith('{') || value.startsWith('[')) {
          JSON.parse(value);
        }
        
        // Look for specific patterns of broken tokens
        if (value.includes('undefined') || 
            value.includes('null') ||
            value.includes('NaN') ||
            value.includes('[object Object]') ||
            (value.includes('"exp":') && value.length < 20) ||
            (value.includes('"sub":') && value.length < 20)) {
          log(`[AuthValidator] Found potentially corrupted token in key: ${key}`);
          keysToRemove.push(key);
          hasCleanedTokens = true;
        }
      } catch (e) {
        // If it fails to parse, it's likely corrupted JSON
        log(`[AuthValidator] Found malformed JSON in key: ${key}`);
        keysToRemove.push(key);
        hasCleanedTokens = true;
      }
    }
    
    // Remove any corrupted keys found
    if (keysToRemove.length > 0) {
      log(`[AuthValidator] Removing ${keysToRemove.length} corrupted token keys`);
      await AsyncStorage.multiRemove(keysToRemove);
      return true;
    }
    
    return hasCleanedTokens;
  } catch (error) {
    error('[AuthValidator] Error checking for corrupted tokens:', error);
    return false;
  }
};

/**
 * Records a JWT error for handling on next app startup
 * Call this when catching a JWT-related error
 */
export const recordJwtError = async (error) => {
  try {
    const errorInfo = {
      message: error.message || 'Unknown JWT error',
      timestamp: new Date().toISOString(),
      stack: error.stack
    };
    
    await AsyncStorage.setItem('last_jwt_error', JSON.stringify(errorInfo));
    console.log('JWT error recorded for diagnostics');
    return true;
  } catch (storageError) {
    console.error('Error recording JWT error:', storageError);
    return false;
  }
};

// Function to specifically handle missing sub claim errors
export const handleMissingSubClaimError = async () => {
  try {
    // Mark this error so we don't keep trying to use the bad token
    await AsyncStorage.setItem('missing_sub_claim_error', 'true');
    
    // Clear auth tokens to force re-authentication
    await clearAllAuthTokens();
    
    console.log('Handled missing sub claim error by clearing tokens');
    return true;
  } catch (error) {
    console.error('Error handling missing sub claim:', error);
    return false;
  }
};

// Check if there's a stored JWT error
export const hasStoredJwtError = async () => {
  try {
    const errorJson = await AsyncStorage.getItem('last_jwt_error');
    return !!errorJson;
  } catch (error) {
    console.error('Error checking for stored JWT error:', error);
    return false;
  }
};

// Clear any stored JWT errors
export const clearStoredJwtErrors = async () => {
  try {
    await AsyncStorage.removeItem('last_jwt_error');
    await AsyncStorage.removeItem('missing_sub_claim_error');
    return true;
  } catch (error) {
    console.error('Error clearing stored JWT errors:', error);
    return false;
  }
};

// Run validation on module import
validateAuthOnStartup().catch(e => 
  error('[AuthValidator] Unhandled error during startup validation:', e)
);

export default {
  validateAuthOnStartup,
  recordJwtError,
  handleMissingSubClaimError,
  hasStoredJwtError,
  clearStoredJwtErrors,
  checkForCorruptedTokens
}; 
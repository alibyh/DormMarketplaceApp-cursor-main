import { Alert } from 'react-native';
import { checkNetworkConnection } from './networkUtils';

/**
 * Enhanced network error handler that provides better user feedback
 * @param {Error} error - The error that occurred
 * @param {Function} t - Translation function
 * @param {string} context - Context where the error occurred
 * @param {Function} retryFunction - Function to retry the operation
 * @returns {Object} - Error information
 */
export const handleNetworkError = async (error, t, context = 'general', retryFunction = null) => {
  console.error(`Network error in ${context}:`, error);

  // Check if it's actually a network error
  const isNetworkError = error.message?.includes('network') || 
                        error.message?.includes('fetch') ||
                        error.message?.includes('timeout') ||
                        error.message?.includes('connection') ||
                        error.message?.includes('ECONNREFUSED') ||
                        error.message?.includes('ENOTFOUND');

  if (isNetworkError) {
    // Double-check network connectivity
    const isConnected = await checkNetworkConnection();
    
    if (!isConnected) {
      return {
        type: 'NETWORK',
        message: t('noInternet'),
        description: t('checkConnection'),
        canRetry: true,
        retryFunction
      };
    } else {
      // Network is connected but request failed - might be server issue
      return {
        type: 'SERVER',
        message: t('serverError'),
        description: t('serverUnavailable'),
        canRetry: true,
        retryFunction
      };
    }
  }

  // Not a network error
  return {
    type: 'OTHER',
    message: t('error'),
    description: error.message || t('unexpectedError'),
    canRetry: false,
    retryFunction: null
  };
};

/**
 * Show network error alert with retry option
 * @param {Object} errorInfo - Error information from handleNetworkError
 * @param {Function} t - Translation function
 */
export const showNetworkErrorAlert = (errorInfo, t) => {
  if (errorInfo.canRetry && errorInfo.retryFunction) {
    Alert.alert(
      errorInfo.message,
      errorInfo.description,
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('retry'), 
          onPress: errorInfo.retryFunction 
        }
      ]
    );
  } else {
    Alert.alert(
      errorInfo.message,
      errorInfo.description,
      [{ text: t('ok') }]
    );
  }
};

/**
 * Wrapper for async operations with network error handling
 * @param {Function} operation - The async operation to perform
 * @param {Function} t - Translation function
 * @param {string} context - Context for error reporting
 * @param {Function} onError - Custom error handler
 * @returns {Promise} - Result of the operation
 */
export const withNetworkErrorHandling = async (operation, t, context = 'general', onError = null) => {
  try {
    return await operation();
  } catch (error) {
    const errorInfo = await handleNetworkError(error, t, context, () => 
      withNetworkErrorHandling(operation, t, context, onError)
    );
    
    if (onError) {
      onError(errorInfo);
    } else {
      showNetworkErrorAlert(errorInfo, t);
    }
    
    throw error;
  }
};


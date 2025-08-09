import { Alert } from 'react-native';
import i18n from '../i18n';
import NetInfo from '@react-native-community/netinfo';

// Error types
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  AUTH: 'AUTH',
  DATABASE: 'DATABASE',
  VALIDATION: 'VALIDATION',
  UNKNOWN: 'UNKNOWN'
};

// Error mapping
const errorMapping = {
  'supabase-js': {
    'auth/invalid-credential': ERROR_TYPES.AUTH,
    'auth/user-not-found': ERROR_TYPES.AUTH,
    'PGRST': ERROR_TYPES.DATABASE,
  }
};

export class AppError extends Error {
  constructor(type, message, originalError = null) {
    super(message);
    this.type = type;
    this.originalError = originalError;
    this.timestamp = new Date();
  }
}

export const checkNetworkConnection = async () => {
  const netInfo = await NetInfo.fetch();
  return netInfo.isConnected && netInfo.isInternetReachable;
};

export const handleError = (error, t, type = 'GENERIC') => {
  console.error(`Error (${type}):`, error);
  
  let message = t('errorGeneric');
  
  switch (type) {
    case 'NETWORK':
      message = t('errorNetwork');
      break;
    case 'CHAT':
      message = t('errorChat');
      break;
    case 'AUTH':
      message = t('errorAuth');
      break;
    default:
      message = t('errorGeneric');
  }

  Alert.alert(
    t('error'),
    message,
    [{ text: t('ok'), style: 'default' }]
  );
};

// Wrapper for async functions
export const withErrorHandling = (asyncFn, context) => {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      await handleAppError(error, context);
      throw error;
    }
  };
};
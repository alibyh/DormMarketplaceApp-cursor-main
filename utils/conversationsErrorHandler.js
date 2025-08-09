import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  AUTH: 'AUTH',
  FETCH_CONVERSATIONS: 'FETCH_CONVERSATIONS',
  SUBSCRIPTION: 'SUBSCRIPTION',
  UNKNOWN: 'UNKNOWN'
};

export const handleConversationsError = async (error, t, type = ERROR_TYPES.UNKNOWN) => {
  // Log error for debugging only in development
  if (__DEV__) {
    console.error(`[ConversationsScreen] ${type} Error:`, error);
  }

  // Check network first if not already a network error
  if (type !== ERROR_TYPES.NETWORK) {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      type = ERROR_TYPES.NETWORK;
    }
  }

  let title = t('error');
  let message = t('unexpectedError');

  switch (type) {
    case ERROR_TYPES.NETWORK:
      title = t('noInternet');
      message = t('checkConnection');
      break;
    case ERROR_TYPES.AUTH:
      title = t('authError');
      message = t('pleaseLoginAgain');
      break;
    case ERROR_TYPES.FETCH_CONVERSATIONS:
      title = t('loadingError');
      message = t('unableToLoadConversations');
      break;
    case ERROR_TYPES.SUBSCRIPTION:
      title = t('updateError');
      message = t('unableToReceiveUpdates');
      break;
  }

  return { title, message }; // Return instead of showing Alert directly
};
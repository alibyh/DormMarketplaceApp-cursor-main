import { Alert } from 'react-native';
import { ErrorTypes } from './errorHandler';

export const handleChatError = (error, t, type = 'GENERIC') => {
  console.error(`Chat error (${type}):`, error);
  
  let message = t('errorGeneric');
  
  switch (type) {
    case 'NETWORK':
      message = t('errorNetwork');
      break;
    case 'INIT_CHAT':
      message = t('errorInitChat');
      break;
    case 'SEND_MESSAGE':
      message = t('errorSendMessage');
      break;
    case 'SUBSCRIPTION':
      message = t('errorSubscription');
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
import { Alert } from 'react-native';
import { ErrorTypes } from './errorHandler';

export const handleConversationError = async (error, t, type = ErrorTypes.UNKNOWN) => {
  console.error(`Conversation Error (${type}):`, error);

  switch (type) {
    case 'FETCH_CONVERSATIONS':
      Alert.alert(
        t('errorConversationsTitle'),
        t('errorConversationsLoad'),
        [{ text: t('retry'), style: 'default' }]
      );
      break;

    case 'SUBSCRIBE_ERROR':
      Alert.alert(
        t('errorSubscriptionTitle'),
        t('errorSubscriptionFailed'),
        [{ text: t('ok'), style: 'default' }]
      );
      break;

    case 'AUTH_ERROR':
      Alert.alert(
        t('errorAuthTitle'),
        t('errorAuthRequired'),
        [{ text: t('ok'), style: 'default' }]
      );
      break;

    case 'NETWORK':
      Alert.alert(
        t('errorNetwork'),
        t('errorCheckConnection'),
        [{ text: t('retry'), style: 'default' }]
      );
      break;

    default:
      Alert.alert(
        t('errorGeneric'),
        t('errorTryAgain'),
        [{ text: t('ok'), style: 'default' }]
      );
  }
};
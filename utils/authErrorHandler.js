import { Alert } from 'react-native';
import { ErrorTypes } from './errorHandler';

export const handleAuthError = (error, t, type = ErrorTypes.UNKNOWN) => {
  console.error(`Auth Error (${type}):`, error);

  switch (type) {
    case 'INVALID_CREDENTIALS':
      return {
        message: t('invalidCredentials'),
        showAlert: false
      };

    case 'RATE_LIMIT':
      Alert.alert(
        t('tooManyAttempts'),
        t('tryAgainLater'),
        [{ text: t('ok'), style: 'default' }]
      );
      break;

    case 'EMAIL_NOT_VERIFIED':
      Alert.alert(
        t('emailVerification'),
        t('verifyEmail'),
        [{ text: t('ok'), style: 'default' }]
      );
      break;

    case 'NETWORK':
      Alert.alert(
        t('networkError'),
        t('checkConnection'),
        [{ text: t('retry'), style: 'default' }]
      );
      break;

    case 'TIMEOUT':
      Alert.alert(
        t('timeoutError'),
        t('slowConnection'),
        [{ text: t('retry'), style: 'default' }]
      );
      break;

    default:
      Alert.alert(
        t('loginError'),
        t('unexpectedError'),
        [{ text: t('ok'), style: 'default' }]
      );
  }
};
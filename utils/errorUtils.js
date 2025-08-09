import { Alert } from 'react-native';

export const handleError = (error, t, customHandler) => {
  console.error('Error occurred:', error);

  if (customHandler && customHandler(error)) {
    return;
  }

  if (!navigator.onLine || error.message?.includes('network')) {
    Alert.alert(
      t('networkError'),
      t('checkConnection'),
      [{ text: t('ok') }]
    );
    return;
  }

  if (error.message?.includes('timeout')) {
    Alert.alert(
      t('requestTimeout'),
      t('requestTookTooLong'),
      [{ text: t('ok') }]
    );
    return;
  }

  Alert.alert(
    t('error'),
    t('unexpectedError'),
    [{ text: t('ok') }]
  );
};
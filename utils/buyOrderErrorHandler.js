import { Alert } from 'react-native';
import { ErrorTypes } from './errorHandler';
import { handleError } from './errorUtils';

export const handleBuyOrderError = (error, t, type = ErrorTypes.UNKNOWN) => {
  console.error(`BuyOrder Error (${type}):`, error);

  switch (type) {
    case 'FETCH_ORDER':
      Alert.alert(
        t('errorOrderTitle'),
        t('errorOrderLoad'),
        [{ text: t('retry'), onPress: () => null }]
      );
      break;

    case 'CONTACT_ERROR':
      Alert.alert(
        t('errorContactTitle'),
        t('errorContactUser'),
        [{ text: t('ok') }]
      );
      break;

    case 'IMAGE_ERROR':
      Alert.alert(
        t('errorImageTitle'),
        t('errorImageLoad'),
        [{ text: t('ok') }]
      );
      break;

    default:
      handleError(error, t);
  }
};
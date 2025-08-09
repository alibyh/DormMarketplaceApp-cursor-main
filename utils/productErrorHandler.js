import { Alert } from 'react-native';
import { ErrorTypes } from './errorHandler';

export const handleProductError = async (error, t, type = ErrorTypes.UNKNOWN) => {
  console.error(`Product Error (${type}):`, error);

  switch (type) {
    case 'FETCH_PRODUCT':
      Alert.alert(
        t('errorProductTitle'),
        t('errorProductLoad'),
        [{ text: t('retry'), style: 'default' }]
      );
      break;

    case 'CONTACT_SELLER':
      Alert.alert(
        t('errorContactTitle'),
        t('errorContactSeller'),
        [{ text: t('ok'), style: 'default' }]
      );
      break;

    case 'IMAGE_LOAD':
      Alert.alert(
        t('errorImageTitle'),
        t('errorImageLoad'),
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
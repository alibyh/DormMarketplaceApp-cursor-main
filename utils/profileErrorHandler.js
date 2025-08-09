import { Alert } from 'react-native';
import { handleError } from './errorUtils';

export const handleProfileError = async (error, t, type = 'GENERIC') => {
  console.error(`Profile Error (${type}):`, error);

  switch (type) {
    case 'FETCH_PROFILE':
      Alert.alert(
        t('errorProfileTitle'),
        t('errorProfileLoad'),
        [{ text: t('retry'), onPress: () => null }]
      );
      break;

    case 'UPDATE_PROFILE':
      Alert.alert(
        t('errorProfileTitle'),
        t('errorProfileUpdate'),
        [{ text: t('ok') }]
      );
      break;

    case 'DELETE_ACCOUNT':
      Alert.alert(
        t('errorAccountTitle'),
        t('errorAccountDeletion'),
        [{ text: t('ok') }]
      );
      break;

    case 'IMAGE_UPLOAD':
      Alert.alert(
        t('errorImageTitle'),
        t('errorImageUpload'),
        [{ text: t('ok') }]
      );
      break;

    default:
      handleError(error, t);
  }
};
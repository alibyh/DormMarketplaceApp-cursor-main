import { Alert } from 'react-native';

export const PROFILE_ERROR_CODES = {
  USERNAME_TAKEN: 'username_taken',
  IMAGE_UPLOAD: 'image_upload_error',
  PROFILE_UPDATE: 'profile_update_error',
  PASSWORD_UPDATE: 'password_update_error',
  NETWORK: 'network_error',
  VALIDATION: 'validation_error',
  STORAGE: 'storage_error'
};

export const handleProfileUpdateError = (error, t, type = 'UNKNOWN') => {
  console.error(`Profile Update Error (${type}):`, error);

  switch (type) {
    case PROFILE_ERROR_CODES.USERNAME_TAKEN:
      return {
        field: 'username',
        message: t('usernameTaken')
      };

    case PROFILE_ERROR_CODES.IMAGE_UPLOAD:
      Alert.alert(
        t('imageUploadError'),
        t('couldNotUploadImage'),
        [{ text: t('retry'), style: 'default' }]
      );
      break;

    case PROFILE_ERROR_CODES.PASSWORD_UPDATE:
      Alert.alert(
        t('passwordUpdateError'),
        t('couldNotUpdatePassword'),
        [{ text: t('ok'), style: 'default' }]
      );
      break;

    case PROFILE_ERROR_CODES.NETWORK:
      Alert.alert(
        t('networkError'),
        t('checkConnection'),
        [{ text: t('retry'), style: 'default' }]
      );
      break;

    case PROFILE_ERROR_CODES.STORAGE:
      Alert.alert(
        t('storageError'),
        t('couldNotSaveImage'),
        [{ text: t('retry'), style: 'default' }]
      );
      break;

    default:
      Alert.alert(
        t('updateError'),
        t('couldNotUpdateProfile'),
        [{ text: t('ok'), style: 'default' }]
      );
  }
};
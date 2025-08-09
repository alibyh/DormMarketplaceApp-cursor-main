import { Alert } from 'react-native';
import { ErrorTypes } from './errorHandler';

export const SIGNUP_ERROR_CODES = {
  EMAIL_IN_USE: 'email_in_use',
  INVALID_EMAIL: 'invalid_email',
  WEAK_PASSWORD: 'weak_password',
  USERNAME_TAKEN: 'username_taken',
  PROFILE_CREATE_FAILED: 'profile_create_failed',
  IMAGE_UPLOAD_FAILED: 'image_upload_failed',
  NETWORK_ERROR: 'network_error',
  TIMEOUT: 'timeout'
};

export const handleSignupError = (error, t, type = ErrorTypes.UNKNOWN) => {
  console.error(`Signup Error (${type}):`, error);

  switch (type) {
    case SIGNUP_ERROR_CODES.EMAIL_IN_USE:
      return {
        message: t('emailAlreadyInUse'),
        field: 'email'
      };

    case SIGNUP_ERROR_CODES.INVALID_EMAIL:
      return {
        message: t('invalidEmail'),
        field: 'email'
      };

    case SIGNUP_ERROR_CODES.WEAK_PASSWORD:
      return {
        message: t('weakPassword'),
        field: 'password'
      };

    case SIGNUP_ERROR_CODES.USERNAME_TAKEN:
      return {
        message: t('usernameTaken'),
        field: 'username'
      };

    case SIGNUP_ERROR_CODES.PROFILE_CREATE_FAILED:
      Alert.alert(
        t('profileError'),
        t('profileCreateFailed'),
        [{ text: t('retry'), style: 'default' }]
      );
      break;

    case SIGNUP_ERROR_CODES.IMAGE_UPLOAD_FAILED:
      Alert.alert(
        t('imageError'),
        t('imageUploadFailed'),
        [{ text: t('continue'), style: 'default' }]
      );
      break;

    case SIGNUP_ERROR_CODES.NETWORK_ERROR:
      Alert.alert(
        t('networkError'),
        t('checkConnection'),
        [{ text: t('retry'), style: 'default' }]
      );
      break;

    case SIGNUP_ERROR_CODES.TIMEOUT:
      Alert.alert(
        t('timeoutError'),
        t('requestTimeout'),
        [{ text: t('retry'), style: 'default' }]
      );
      break;

    default:
      Alert.alert(
        t('signupError'),
        t('unexpectedError'),
        [{ text: t('ok'), style: 'default' }]
      );
  }
};
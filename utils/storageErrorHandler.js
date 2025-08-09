import { Alert } from 'react-native';
import { BaseError } from './errors/BaseError';

export const STORAGE_ERROR_CODES = {
  WRITE_FAILED: 'write_failed',
  READ_FAILED: 'read_failed',
  QUOTA_EXCEEDED: 'quota_exceeded',
  PERMISSION_DENIED: 'permission_denied'
};

export class StorageError extends BaseError {
  constructor(message, code = STORAGE_ERROR_CODES.WRITE_FAILED, details = {}) {
    super('STORAGE', message, code, details);
  }
}

export const handleStorageError = (error, t, type = 'UNKNOWN') => {
  console.error(`Storage Error (${type}):`, error);

  switch (type) {
    case STORAGE_ERROR_CODES.WRITE_FAILED:
      Alert.alert(
        t('errorStorageTitle'),
        t('errorStorageWrite'),
        [{ text: t('retry'), style: 'default' }]
      );
      break;

    case STORAGE_ERROR_CODES.READ_FAILED:
      Alert.alert(
        t('errorStorageTitle'),
        t('errorStorageRead'),
        [{ text: t('retry'), style: 'default' }]
      );
      break;

    case STORAGE_ERROR_CODES.QUOTA_EXCEEDED:
      Alert.alert(
        t('errorStorageTitle'),
        t('errorStorageQuota'),
        [{ text: t('ok'), style: 'default' }]
      );
      break;

    default:
      Alert.alert(
        t('errorStorageTitle'),
        t('errorStorageGeneric'),
        [{ text: t('ok'), style: 'default' }]
      );
  }
};
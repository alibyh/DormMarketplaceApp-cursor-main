import { Alert } from 'react-native';
import { BaseError } from './errors/BaseError';

export const SERVICE_ERROR_CODES = {
  CONNECTION_FAILED: 'connection_failed',
  TIMEOUT: 'timeout',
  RATE_LIMIT: 'rate_limit',
  SERVICE_UNAVAILABLE: 'service_unavailable'
};

export class ServiceError extends BaseError {
  constructor(message, code = SERVICE_ERROR_CODES.CONNECTION_FAILED, details = {}) {
    super('SERVICE', message, code, details);
  }
}

export const handleServiceError = (error, t, type = 'UNKNOWN') => {
  console.error(`Service Error (${type}):`, error);

  switch (type) {
    case SERVICE_ERROR_CODES.CONNECTION_FAILED:
      Alert.alert(
        t('errorServiceTitle'),
        t('errorServiceConnection'),
        [{ text: t('retry'), style: 'default' }]
      );
      break;

    case SERVICE_ERROR_CODES.TIMEOUT:
      Alert.alert(
        t('errorServiceTitle'),
        t('errorServiceTimeout'),
        [{ text: t('retry'), style: 'default' }]
      );
      break;

    case SERVICE_ERROR_CODES.RATE_LIMIT:
      Alert.alert(
        t('errorServiceTitle'),
        t('errorServiceRateLimit'),
        [{ text: t('ok'), style: 'default' }]
      );
      break;

    default:
      Alert.alert(
        t('errorServiceTitle'),
        t('errorServiceGeneric'),
        [{ text: t('retry'), style: 'default' }]
      );
  }
};
import { Alert } from 'react-native';
import { BaseError } from './errors/BaseError';

export const INIT_ERROR_CODES = {
  CONFIG_LOAD: 'config_load_failed',
  CACHE_INIT: 'cache_init_failed',
  SERVICE_INIT: 'service_init_failed',
  RESOURCE_LOAD: 'resource_load_failed'
};

export class InitializationError extends BaseError {
  constructor(message, code = INIT_ERROR_CODES.SERVICE_INIT, details = {}) {
    super('INITIALIZATION', message, code, details);
  }
}

export const handleInitializationError = (error, t, type = 'UNKNOWN') => {
  console.error(`Initialization Error (${type}):`, error);

  switch (type) {
    case INIT_ERROR_CODES.CONFIG_LOAD:
      Alert.alert(
        t('errorConfigTitle'),
        t('errorConfigLoad'),
        [{ text: t('retry'), style: 'default' }]
      );
      break;

    case INIT_ERROR_CODES.CACHE_INIT:
      Alert.alert(
        t('errorCacheTitle'),
        t('errorCacheInit'),
        [{ text: t('continue'), style: 'default' }]
      );
      break;

    case INIT_ERROR_CODES.SERVICE_INIT:
      Alert.alert(
        t('errorServiceTitle'),
        t('errorServiceInit'),
        [{ text: t('retry'), style: 'default' }]
      );
      break;

    case INIT_ERROR_CODES.RESOURCE_LOAD:
      Alert.alert(
        t('errorResourceTitle'),
        t('errorResourceLoad'),
        [{ text: t('retry'), style: 'default' }]
      );
      break;

    default:
      Alert.alert(
        t('errorInitTitle'),
        t('errorInitGeneric'),
        [{ text: t('retry'), style: 'default' }]
      );
  }
};
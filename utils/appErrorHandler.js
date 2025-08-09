import { Alert } from 'react-native';
import { BaseError } from './errors/BaseError';
import { ErrorRegistry } from './errorRegistry';

export const APP_ERROR_CODES = {
  INITIALIZATION: 'app_initialization_failed',
  NAVIGATION: 'navigation_failed',
  SERVICE_START: 'service_start_failed',
  CRITICAL: 'critical_error',
  STATE_MANAGEMENT: 'state_management_error'
};

export class AppError extends BaseError {
  constructor(message, code = APP_ERROR_CODES.CRITICAL, details = {}) {
    super('APP', message, code, details);
  }
}

export const handleAppError = (error, context = 'unknown', t) => {
  console.error(`App Error (${context}):`, error);

  // If error already handled by another handler, don't show another alert
  if (error.handled) return;

  // Try to use specific handler if available
  if (error.type && ErrorRegistry[error.type]) {
    return ErrorRegistry[error.type](error, t);
  }

  switch (context) {
    case 'app_initialization':
      Alert.alert(
        t('errorAppInit') || 'Initialization Error',
        t('errorAppInitMessage') || 'Could not initialize the application. Please try again.',
        [
          {
            text: t('retry') || 'Retry',
            onPress: () => {
              // App will handle retry logic
            }
          }
        ]
      );
      break;

    case 'navigation':
      Alert.alert(
        t('errorNavigation') || 'Navigation Error',
        t('errorNavigationMessage') || 'Could not navigate to the requested screen.',
        [{ text: t('ok') || 'OK' }]
      );
      break;

    case 'i18n_initialization':
      Alert.alert(
        t('errorI18n') || 'Language Error',
        t('errorI18nMessage') || 'Could not load language settings.',
        [{ text: t('ok') || 'OK' }]
      );
      break;

    case 'supabase_initialization':
      Alert.alert(
        t('errorDatabase') || 'Database Error',
        t('errorDatabaseMessage') || 'Could not connect to the database.',
        [{ text: t('retry') || 'Retry' }]
      );
      break;

    case 'notifications_initialization':
      Alert.alert(
        t('errorNotifications') || 'Notifications Error',
        t('errorNotificationsMessage') || 'Could not initialize notifications.',
        [{ text: t('ok') || 'OK' }]
      );
      break;

    case 'state_management':
      Alert.alert(
        t('errorState') || 'State Error',
        t('errorStateMessage') || 'An error occurred while managing application state.',
        [{ text: t('ok') || 'OK' }]
      );
      break;

    default:
      Alert.alert(
        t('errorApp') || 'Application Error',
        t('errorAppMessage') || 'An unexpected error occurred. Please try again.',
        [{ text: t('ok') || 'OK' }]
      );
  }

  // Mark error as handled
  error.handled = true;
  return error;
};

// Helper function to determine if an error is critical
export const isCriticalError = (error) => {
  return error.code === APP_ERROR_CODES.CRITICAL ||
         error.message?.toLowerCase().includes('critical') ||
         error.fatal === true;
};

// Wrapper for initialization functions
export const withInitializationErrorHandling = (initFn, context) => {
  return async (...args) => {
    try {
      return await initFn(...args);
    } catch (error) {
      handleAppError(error, context);
      throw new AppError(
        `Initialization failed for ${context}`,
        APP_ERROR_CODES.INITIALIZATION,
        { originalError: error }
      );
    }
  };
};
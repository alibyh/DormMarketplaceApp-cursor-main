import { handleAuthError } from './authErrorHandler';
import { handleNavigationError } from './navigationErrorHandler';
import { handleInitializationError } from './initializationErrorHandler';
import { handleStorageError } from './storageErrorHandler';
import { handleServiceError } from './serviceErrorHandler';
import { handleDatabaseError } from './databaseErrorHandler';
import { handleNetworkError } from './networkUtils';

export const ErrorRegistry = {
  AUTH: handleAuthError,
  NAVIGATION: handleNavigationError,
  INITIALIZATION: handleInitializationError,
  STORAGE: handleStorageError,
  SERVICE: handleServiceError,
  DATABASE: handleDatabaseError,
  NETWORK: handleNetworkError
};

export const handleGlobalError = (error, t, type = 'UNKNOWN') => {
  const handler = ErrorRegistry[error.type] || ErrorRegistry.SERVICE;
  return handler(error, t, type);
};
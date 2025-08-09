import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import LoadingState from '../LoadingState/LoadingState';
import RetryView from '../RetryView/RetryView';
import { checkNetworkConnection } from '../../utils/networkUtils';
import { handleError } from '../../utils/errorUtils';

const ErrorBoundaryWrapper = ({ 
  children, 
  onRetry,
  loadingMessage,
  errorMessage,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const wrappedOnRetry = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        throw new Error('network');
      }

      await onRetry();
    } catch (err) {
      setError(err);
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingState message={loadingMessage} />;
  }

  if (error) {
    return <RetryView onRetry={wrappedOnRetry} message={errorMessage} />;
  }

  return children;
};
export default ErrorBoundaryWrapper
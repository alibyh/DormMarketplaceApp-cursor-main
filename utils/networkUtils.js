import NetInfo from '@react-native-community/netinfo';

export const checkNetworkConnection = async () => {
  try {
    // First check device's network state
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      return false;
    }

    // Then verify internet connectivity
    const response = await fetch('https://google.com', { 
      method: 'HEAD',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    console.error('Network check error:', error);
    return false;
  }
};

export const withNetworkRetry = async (operation, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        throw new Error('NO_NETWORK');
      }
      
      return await operation();
    } catch (error) {
      if (error.message === 'NO_NETWORK' || 
          error.message.includes('network') ||
          error.message.includes('timeout')) {
        
        if (attempt === maxRetries) {
          throw new Error('NETWORK_ERROR');
        }
        
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
        continue;
      }
      throw error;
    }
  }
};
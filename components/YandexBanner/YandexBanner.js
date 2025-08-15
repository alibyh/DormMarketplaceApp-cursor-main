// components/YandexBanner/YandexBanner.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text, NativeModules, DeviceEventEmitter } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const { YandexAdsModule } = NativeModules;

// Use actual Yandex ad unit ID
const AD_UNIT_ID = 'R-M-16546684-1';

// Real Yandex banner component that uses native modules
const YandexBanner = ({ onAdLoaded }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [adError, setAdError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize Yandex Ads SDK
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('[YandexBanner] Checking native module availability');
        
        if (!YandexAdsModule) {
          throw new Error('Native module not available');
        }
        
        console.log('[YandexBanner] Initializing Yandex Ads SDK');
        await YandexAdsModule.initialize();
        console.log('[YandexBanner] Yandex Ads SDK initialized successfully');
        setIsInitialized(true);
        
        // Set up event listeners for ad events
        const adLoadedListener = DeviceEventEmitter.addListener('onAdLoaded', (event) => {
          if (event.type === 'banner') {
            console.log('[YandexBanner] Banner ad loaded successfully');
            setIsLoading(false);
            if (onAdLoaded) {
              onAdLoaded();
            }
          }
        });
        
        const adFailedListener = DeviceEventEmitter.addListener('onAdFailedToLoad', (event) => {
          if (event.type === 'banner') {
            console.error('[YandexBanner] Banner ad failed to load:', event.error);
            setAdError(event.error || 'Failed to load ad');
            setIsLoading(false);
          }
        });
        
        return () => {
          adLoadedListener.remove();
          adFailedListener.remove();
        };
        
      } catch (error) {
        console.error('[YandexBanner] Failed to initialize Yandex Ads SDK:', error);
        setAdError('Failed to initialize SDK: ' + error.message);
        setIsLoading(false);
      }
    };
    
    initialize();
  }, [onAdLoaded]);
  
  // Load banner ad once initialized
  useEffect(() => {
    if (isInitialized && YandexAdsModule) {
      const loadBanner = async () => {
        try {
          console.log('[YandexBanner] Loading banner ad with unit ID:', AD_UNIT_ID);
          
          // Create a simple banner without requiring a specific view tag
          await YandexAdsModule.showBanner(AD_UNIT_ID, {});
          
        } catch (error) {
          console.error('[YandexBanner] Error loading banner:', error);
          setAdError('Failed to load banner: ' + error.message);
          setIsLoading(false);
        }
      };
      
      loadBanner();
    }
  }, [isInitialized]);

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholderBanner}>
          <Text style={styles.placeholderText}>
            Loading Ad...
          </Text>
        </View>
      </View>
    );
  }

  // Show error state
  if (adError) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholderBanner}>
          <Text style={styles.placeholderText}>
            Ad unavailable: {adError}
          </Text>
        </View>
      </View>
    );
  }

  // Show placeholder for the real Yandex banner ad
  // The actual ad view is managed by the native module
  return (
    <View style={styles.container}>
      <View style={styles.bannerView}>
        <Text style={styles.adText}>Yandex Ad Loading...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: screenWidth,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  bannerView: {
    width: screenWidth - 32,
    height: 50,
    backgroundColor: '#4285F4',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  adContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  adText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  adSubtext: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
  placeholderBanner: {
    width: screenWidth - 32,
    height: 50,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  placeholderText: {
    color: '#666',
    fontSize: 14,
  },
  adIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adIndicatorText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default YandexBanner;

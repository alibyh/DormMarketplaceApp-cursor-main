// components/YandexBanner/YandexBanner.js
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text, Platform } from 'react-native';
import { initializeYandexAds } from '../../modules/yandex-ads';
import YandexBannerView from '../../modules/yandex-ads/YandexBannerView';

const { width: screenWidth } = Dimensions.get('window');

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
        console.log('[YandexBanner] Initializing Yandex Ads SDK');
        await initializeYandexAds();
        console.log('[YandexBanner] Yandex Ads SDK initialized successfully');
        setIsInitialized(true);
      } catch (error) {
        console.error('[YandexBanner] Failed to initialize Yandex Ads SDK:', error);
        setAdError('Failed to initialize SDK');
        setIsLoading(false);
      }
    };
    
    initialize();
  }, []);

  // Handle ad loading events
  const handleAdLoaded = () => {
    console.log('[YandexBanner] Ad loaded successfully');
    setIsLoading(false);
    if (onAdLoaded) {
      onAdLoaded();
    }
  };

  const handleAdFailedToLoad = (error) => {
    console.error('[YandexBanner] Ad failed to load:', error);
    setAdError(error?.message || 'Failed to load ad');
    setIsLoading(false);
  };

  // Show loading state
  if (isLoading && !isInitialized) {
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

  // Show the real Yandex banner ad
  return (
    <View style={styles.container}>
      <YandexBannerView
        adUnitId={AD_UNIT_ID}
        style={styles.bannerView}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdFailedToLoad}
      />
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

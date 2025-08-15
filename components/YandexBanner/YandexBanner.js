// components/YandexBanner/YandexBanner.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text, Platform, NativeModules } from 'react-native';
import YandexAdsBridge from './YandexBridgeModule';

const { width: screenWidth } = Dimensions.get('window');

// Use actual Yandex ad unit ID
const AD_UNIT_ID = 'R-M-16546684-1';

const YandexBanner = ({ onAdLoaded }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [adError, setAdError] = useState(null);

  useEffect(() => {
    const loadBanner = async () => {
      try {
        console.log('[YandexBanner] Starting banner initialization');
        
        // Check if native module exists
        if (!NativeModules.YandexAdsModule) {
          console.error('[YandexBanner] YandexAdsModule not found in NativeModules');
          setAdError('Native module not available');
          setIsLoading(false);
          return;
        }

        // Initialize and load banner
        await YandexAdsBridge.initialize();
        await YandexAdsBridge.loadBanner(AD_UNIT_ID);
        
        console.log('[YandexBanner] Banner loaded successfully');
        
        // Notify parent component
        if (onAdLoaded) {
          onAdLoaded();
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('[YandexBanner] Error loading banner:', error);
        setAdError(error.message || 'Failed to load ad');
        setIsLoading(false);
      }
    };

    loadBanner();
  }, [onAdLoaded]);

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholderBanner}>
          <Text style={styles.placeholderText}>
            Loading Yandex Ad...
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

  // Show a simple container for the native ad
  // The actual ad will be rendered by the native module
  return (
    <View style={styles.container}>
      <View style={styles.bannerView} />
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
});

export default YandexBanner;

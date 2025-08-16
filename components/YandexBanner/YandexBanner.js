// components/YandexBanner/YandexBanner.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, Linking } from 'react-native';
import { MobileAds, BannerView, BannerAdSize, AdRequestConfiguration } from 'yandex-mobile-ads';

const { width: screenWidth } = Dimensions.get('window');

// Use actual Yandex ad unit ID
const AD_UNIT_ID = 'demo-banner-yandex';

// Real Yandex banner component using official yandex-mobile-ads package
const YandexBanner = ({ onAdLoaded }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [adError, setAdError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  
  // Initialize Yandex Ads SDK
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('[YandexBanner] Starting Yandex Mobile Ads SDK initialization');
        
        // Add a timeout to prevent infinite loading
        const initTimeout = setTimeout(() => {
          console.error('[YandexBanner] SDK initialization timeout');
          setAdError('SDK initialization timeout');
          setIsLoading(false);
        }, 10000); // 10 second timeout
        AdRequestConfiguration.setUserConsent(true);
        MobileAds.enableLogging();
        // Initialize the SDK
        await MobileAds.initialize();
        clearTimeout(initTimeout);
        
        console.log('[YandexBanner] Yandex Mobile Ads SDK initialized successfully');
        setIsInitialized(true);
        
        // Set up a fallback timeout in case the BannerView never loads
        setTimeout(() => {
          if (isLoading) {
            console.log('[YandexBanner] BannerView timeout, showing fallback');
            setShowFallback(true);
            setIsLoading(false);
            if (onAdLoaded) {
              console.log('[YandexBanner] Calling onAdLoaded for auto-sliding (fallback)');
              onAdLoaded();
            }
          }
        }, 8000); // 8 second timeout for the actual ad
        
      } catch (error) {
        console.error('[YandexBanner] Failed to initialize Yandex Mobile Ads SDK:', error);
        console.error('[YandexBanner] Error details:', error.stack);
        setAdError('Failed to initialize SDK: ' + (error.message || 'Unknown error'));
        setIsLoading(false);
      }
    };
    
    initialize();
  }, [onAdLoaded]);

  // Handle ad loading success
  const handleAdLoaded = () => {
    console.log('[YandexBanner] Banner ad loaded successfully');
    setIsLoading(false);
    if (onAdLoaded) {
      onAdLoaded();
    }
  };

  // Handle ad loading failure
  const handleAdFailedToLoad = (error) => {
    console.error('[YandexBanner] Banner ad failed to load:', error);
    setAdError(error?.message || 'Failed to load ad');
    setIsLoading(false);
  };

  // Show loading state
  if (isLoading && !adError) {
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

  // Show error state or fallback
  if (adError || showFallback) {
    return (
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.bannerView}
          onPress={() => Linking.openURL('https://yandex.ru')}
        >
          <View style={styles.adContent}>
            <Text style={styles.adText}>Yandex Advertisement</Text>
            <Text style={styles.adSubtext}>
              {adError ? 'Fallback Mode' : 'Sponsored Content'} - Tap to learn more
            </Text>
          </View>
          <View style={styles.adIndicator}>
            <Text style={styles.adIndicatorText}>Ad</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // Show the real Yandex banner ad using official component
  if (isInitialized) {
    console.log('[YandexBanner] Rendering BannerView with ad unit:', AD_UNIT_ID);
    
    return (
      <View style={styles.container}>
        <BannerView
          adUnitId={AD_UNIT_ID}
          adSize={BannerAdSize.flexibleBanner(screenWidth - 32, 50)}
          style={styles.bannerView}
          onAdLoaded={() => {
            console.log('[YandexBanner] BannerView onAdLoaded callback triggered');
            handleAdLoaded();
          }}
          onAdFailedToLoad={(error) => {
            console.log('[YandexBanner] BannerView onAdFailedToLoad callback triggered:', error);
            handleAdFailedToLoad(error);
          }}
          onAdClicked={() => {
            console.log('[YandexBanner] Banner ad clicked');
          }}
        />
        {/* Add a timeout fallback in case the BannerView never loads */}
        {isLoading && (
          <View style={styles.fallbackContainer}>
            <Text style={styles.fallbackText}>Real ad loading...</Text>
          </View>
        )}
      </View>
    );
  }

  return null;
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
  fallbackContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  fallbackText: {
    color: '#666',
    fontSize: 12,
  },
});

export default YandexBanner;

// components/YandexBanner/YandexBanner.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { MobileAds, BannerView, BannerAdSize } from 'yandex-mobile-ads';

const { width: screenWidth } = Dimensions.get('window');

// Detect if the native Yandex SDK is available (e.g., NOT Expo Go)
const isYandexAvailable =
  !!MobileAds &&
  typeof MobileAds.initialize === 'function' &&
  !!BannerAdSize &&
  typeof BannerAdSize.inlineSize === 'function' &&
  !!BannerView;

// Use actual Yandex ad unit ID
    const IOS_AD_UNIT_ID = 'R-M-16546684-1';
const YandexBanner = ({ onAdLoaded }) => {
  const [bannerSize, setBannerSize] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeBanner = async () => {
      try {
        console.log('[YandexBanner] Starting banner initialization');
        console.log('[YandexBanner] SDK Available:', isYandexAvailable);
        console.log('[YandexBanner] MobileAds:', !!MobileAds);
        console.log('[YandexBanner] BannerView:', !!BannerView);
        console.log('[YandexBanner] BannerAdSize:', !!BannerAdSize);
        
        if (!isYandexAvailable) {
          console.warn(
            '[YandexBanner] Yandex Ads SDK not available (likely Expo Go). Rendering placeholder.'
          );
          setIsLoading(false);
          return;
        }

        // Initialize SDK once and create banner size
        console.log('[YandexBanner] Creating banner size');
        try {
          const size = await BannerAdSize.inlineSize(screenWidth - 32, 50);
          console.log('[YandexBanner] Banner size created successfully:', size);
          setBannerSize(size);
        } catch (sizeError) {
          console.error('[YandexBanner] Error creating banner size:', sizeError);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('[YandexBanner] Failed to initialize banner:', error);
        setIsLoading(false);
      }
    };

    initializeBanner();
  }, []);

  if (isLoading || !bannerSize) {
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

  if (!isYandexAvailable) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholderBanner}>
          <Text style={styles.placeholderText}>
            Ad placeholder (Yandex SDK unavailable)
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BannerView
        adUnitId={IOS_AD_UNIT_ID}
        size={bannerSize}
        onAdLoaded={() => {
          console.log('[YandexBanner] Ad loaded successfully');
          if (onAdLoaded) {
            console.log('[YandexBanner] Calling onAdLoaded callback');
            onAdLoaded();
          }
        }}
        onAdFailedToLoad={(error) => {
          console.error('[YandexBanner] Ad failed to load:', error);
        }}
        onAdClicked={() => console.log('[YandexBanner] Ad clicked')}
        onAdImpression={() => console.log('[YandexBanner] Ad impression recorded')}
        style={styles.bannerView}
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

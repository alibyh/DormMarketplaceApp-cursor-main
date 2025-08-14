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

// Use Yandex demo unit in dev builds to validate integration
const IOS_AD_UNIT_ID = __DEV__ ? 'demo-banner-yandex' : 'R-M-16546684-1';

const YandexBanner = () => {
  const [bannerSize, setBannerSize] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeBanner = async () => {
      try {
        if (!isYandexAvailable) {
          console.warn(
            'Yandex Ads SDK not available (likely Expo Go). Rendering placeholder.'
          );
          setIsLoading(false);
          return;
        }

        // Initialize SDK once and create banner size
        await MobileAds.initialize();
        const size = await BannerAdSize.inlineSize(screenWidth - 32, 50);
        setBannerSize(size);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize banner size:', error);
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
        onAdLoaded={() => console.log('Yandex ad loaded successfully')}
        onAdFailedToLoad={(error) =>
          console.error('Yandex ad failed to load:', error)
        }
        onAdClicked={() => console.log('Yandex ad clicked')}
        onAdImpression={() => console.log('Yandex ad impression')}
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

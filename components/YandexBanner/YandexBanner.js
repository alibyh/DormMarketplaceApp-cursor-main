// components/YandexBanner/YandexBanner.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, Linking } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

// Use actual Yandex ad unit ID
const AD_UNIT_ID = 'R-M-16546684-1';

// Simple fallback banner component that doesn't rely on native modules
const YandexBanner = ({ onAdLoaded }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [adLoaded, setAdLoaded] = useState(false);

  // Simulate ad loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setAdLoaded(true);
      if (onAdLoaded) {
        console.log('[YandexBanner] Simulating ad loaded callback');
        onAdLoaded();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [onAdLoaded]);

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

  // Create a fallback banner with static content
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.bannerView}
        onPress={() => Linking.openURL('https://yandex.ru')}
      >
        <View style={styles.adContent}>
          <Text style={styles.adText}>Yandex Advertisement</Text>
          <Text style={styles.adSubtext}>Tap to learn more</Text>
        </View>
        <View style={styles.adIndicator}>
          <Text style={styles.adIndicatorText}>Ad</Text>
        </View>
      </TouchableOpacity>
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

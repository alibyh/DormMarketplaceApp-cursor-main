// components/YandexBanner/YandexBanner.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, Linking } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

// Temporary placeholder banner while Yandex SDK is being fixed
const YandexBanner = ({ onAdLoaded }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
      if (onAdLoaded) {
        onAdLoaded();
      }
    }, 2000);
  }, [onAdLoaded]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholderBanner}>
          <Text style={styles.placeholderText}>
            Loading Ad...
          </Text>
          <Text style={styles.debugText}>
            Yandex SDK temporarily disabled due to build conflicts
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.bannerView}
        onPress={() => Linking.openURL('https://yandex.ru')}
      >
        <View style={styles.adContent}>
          <Text style={styles.adText}>Yandex Advertisement</Text>
          <Text style={styles.adSubtext}>
            SDK temporarily disabled - Tap to learn more
          </Text>
          <Text style={styles.debugText}>
            Build conflicts being resolved
          </Text>
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
    backgroundColor: '#f5f5f5'
  },
  placeholderBanner: {
    width: screenWidth - 32,
    height: 50,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8
  },
  placeholderText: {
    color: '#666',
    fontSize: 14
  },
  bannerView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc'
  },
  adContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 5
  },
  adText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  adSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  adIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff0000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  adIndicatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  debugText: {
    fontSize: 10,
    color: '#999',
    marginTop: 5
  }
});

export default YandexBanner;

// components/YandexBanner/YandexNativeAd.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MobileAds } from 'yandex-mobile-ads';

const { width: screenWidth } = Dimensions.get('window');

// Initialize the Yandex Mobile Ads SDK once
MobileAds.initialize();

const YandexNativeAd = ({ onAdClicked, onAdLoaded, onAdFailedToLoad }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [adData, setAdData] = useState(null);

  useEffect(() => {
    // Simulate ad loading - in a real implementation, you would load actual ad data
    const loadAd = async () => {
      try {
        // Simulate ad loading delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock ad data - in real implementation, this would come from Yandex Ads
        const mockAdData = {
          title: 'Sponsored Content',
          description: 'Discover amazing products from our partners',
          imageUrl: 'https://via.placeholder.com/300x200/ff5722/ffffff?text=Sponsored',
          ctaText: 'Learn More',
          advertiser: 'Partner Brand'
        };
        
        setAdData(mockAdData);
        setIsLoaded(true);
        onAdLoaded && onAdLoaded();
      } catch (error) {
        console.error('Failed to load native ad:', error);
        onAdFailedToLoad && onAdFailedToLoad(error);
      }
    };

    loadAd();
  }, []);

  const handleAdClick = () => {
    console.log('Native ad clicked');
    onAdClicked && onAdClicked();
    // In real implementation, you would track the click and open the ad URL
  };

  if (!isLoaded || !adData) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Ad...</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={handleAdClick} activeOpacity={0.8}>
      <View style={styles.adContainer}>
        {/* Ad Badge */}
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>Ad</Text>
        </View>
        
        {/* Ad Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: adData.imageUrl }}
            style={styles.adImage}
            resizeMode="cover"
          />
        </View>
        
        {/* Ad Content */}
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.advertiserText}>{adData.advertiser}</Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </View>
          
          <Text style={styles.titleText} numberOfLines={2}>
            {adData.title}
          </Text>
          
          <Text style={styles.descriptionText} numberOfLines={2}>
            {adData.description}
          </Text>
          
          <View style={styles.ctaContainer}>
            <Text style={styles.ctaText}>{adData.ctaText}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 10,
    marginVertical: 5,
  },
  loadingContainer: {
    height: 200,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
  },
  adContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  adBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1,
  },
  adBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  imageContainer: {
    height: 120,
    backgroundColor: '#f5f5f5',
  },
  adImage: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    padding: 15,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  advertiserText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  titleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  ctaContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#ff5722',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default YandexNativeAd; 
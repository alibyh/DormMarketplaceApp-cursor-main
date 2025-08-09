import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import supabase from '../../services/supabaseConfig'; // Add this import
import { getImageUrl } from '../../utils/imageUtils';

// Update the ImageWithFallback component
const ImageWithFallback = ({ uri, style }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Reset states when URI changes
    setIsLoading(true);
    setHasError(false);
  }, [uri]);


  if (hasError || !uri) {
    return (
      <View style={[style, styles.imagePlaceholder]}>
        <Image 
          source={require('../../assets/placeholder.png')}
          style={[style, { width: '50%', height: '50%' }]}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View style={style}>
      <Image
        source={{ uri }}
        style={[style, isLoading && styles.hiddenImage]}
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          console.error('Image failed to load:', uri);
          setHasError(true);
          setIsLoading(false);
        }}
        resizeMode="cover"
      />
      {isLoading && (
        <View style={[StyleSheet.absoluteFill, styles.loaderContainer]}>
          <ActivityIndicator size="small" color="#ff5722" />
        </View>
      )}
    </View>
  );
};

// Update the ProductCard component
const ProductCard = ({ productName, price, dormNumber, productImage, type, isWantToBuy, createdAt }) => {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);


  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        <Image
          source={
            !imageError && productImage 
              ? { uri: productImage }
              : require('../../assets/placeholder.png')
          }
          style={styles.image}
          onError={(e) => {
            console.error('Image loading error:', {
              url: productImage,
              error: e.nativeEvent.error
            });
            setImageError(true);
          }}
          onLoad={() => {
          }}
          defaultSource={require('../../assets/placeholder.png')}
          resizeMode="cover"
        />
      </View>

      {isWantToBuy && (
        <View style={styles.wantToBuyBadge}>
          <Text style={styles.wantToBuyText}>{t('lookingFor')}</Text>
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={2}>{productName}</Text>
        {price && <Text style={styles.price}>{price}</Text>}
        <View style={styles.bottomContainer}>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.dorm}>{dormNumber}</Text>
          </View>
          <Text style={styles.timeText}>
            {new Date(createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Add or update these styles
const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 10,
    marginBottom: 15,
    padding: 5,
    // Enhanced shadows for iOS
    shadowColor: '#000',
    shadowOffset: { 
      width: 0, 
      height: 4 
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    // Enhanced elevation for Android
    elevation: 8,
    overflow: 'hidden',
    // Add border for extra definition
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  imageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  loader: {
    position: 'absolute',
    zIndex: 1,
  },
  errorImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0.7,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  infoContainer: {
    padding: 12,
    backgroundColor: '#fff', // Ensure consistent background
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a', // Darker text for better contrast
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff5722',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dorm: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  wantToBuyBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#104d59',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    // Enhanced badge shadows
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    // Add border for extra definition
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  wantToBuyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  imagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0'
  },
  hiddenImage: {
    opacity: 0
  },
  loaderContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  imagePlaceholder: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default ProductCard;
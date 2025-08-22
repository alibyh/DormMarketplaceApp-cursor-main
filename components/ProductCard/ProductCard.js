import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
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
  const { getThemeColors } = useTheme();
  const colors = getThemeColors();
  const [imageError, setImageError] = useState(false);


  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
      <View style={[styles.imageContainer, { backgroundColor: colors.card }]}>
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
        <View style={[styles.wantToBuyBadge, { backgroundColor: colors.secondary, shadowColor: colors.shadow }]}>
          <Text style={styles.wantToBuyText}>{t('lookingFor')}</Text>
        </View>
      )}

      <View style={[styles.infoContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{productName}</Text>
        {price && <Text style={[styles.price, { color: colors.primary }]}>{price}</Text>}
        <View style={[styles.bottomContainer, { borderTopColor: colors.border }]}>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={16} color={colors.textSecondary} />
            <Text style={[styles.dorm, { color: colors.textSecondary }]}>{dormNumber}</Text>
          </View>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>
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
    borderRadius: 12,
    marginHorizontal: 10,
    marginBottom: 15,
    padding: 5,
    // Enhanced shadows for iOS
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
  },
  imageContainer: {
    width: '100%',
    height: 200,
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
    borderTopWidth: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
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
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dorm: {
    marginLeft: 4,
    fontSize: 14,
  },
  timeText: {
    fontSize: 12,
  },
  wantToBuyBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    // Enhanced badge shadows
    elevation: 4,
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
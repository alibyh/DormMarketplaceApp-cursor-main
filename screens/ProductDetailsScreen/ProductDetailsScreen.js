import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  FlatList,
  Alert,
  Linking,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import supabase from '../../services/supabaseConfig';
import { getProductById } from '../../services/productService';
import { 
  findOrCreateConversation,
  ERROR_CODES
} from '../../services/messageService';
import ErrorBoundaryWrapper from '../../components/ErrorBoundary/ErrorBoundaryWrapper';
import { handleProductError } from '../../utils/productErrorHandler';
import { checkNetworkConnection } from '../../utils/networkUtils';
import { getAvatarUrl } from '../../utils/imageUtils';  // Add this import
import { useFocusEffect } from '@react-navigation/native';
import { checkAuthenticationWithFallback } from '../../utils/authUtils';

const { width, height } = Dimensions.get('window');

// Add this helper function at the top of the file
const getImageUrl = (imagePath, productType) => {
  if (!imagePath) return null;
  
  const bucket = productType === 'buy' ? 'buy-orders-images' : 'product_images';
  return supabase.storage
    .from(bucket)
    .getPublicUrl(imagePath)
    .data?.publicUrl;
};

// Add this helper at the top level before the component
const forceImageReload = (uri) => {
  if (!uri) return uri;
  // If the URI already has a timestamp parameter, replace it; otherwise, add it
  if (uri.includes('?t=')) {
    return uri.replace(/\?t=\d+/, `?t=${Date.now()}`);
  }
  return `${uri}?t=${Date.now()}`;
};

// Add this enhanced debugging helper at the top
const getImageUrlForProductType = (imagePath, productType) => {
  if (!imagePath) {

    return null;
  }
  
  // Handle case where the path already contains the full URL
  if (imagePath.startsWith('http')) {
    return `${imagePath}?t=${Date.now()}`;
  }
  
  // Be very explicit about bucket selection
  const bucket = productType === 'buy' ? 'buy-orders-images' : 'product_images';
  
  try {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(imagePath);
    
    const publicUrl = data?.publicUrl;
    
    if (publicUrl) {
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      return urlWithTimestamp;
    } else {
      console.error(`Failed to generate public URL for ${imagePath} in ${bucket}`);
      return null;
    }
  } catch (error) {
    console.error(`Error generating image URL for ${productType}:`, {
      bucket,
      path: imagePath,
      error
    });
    return null;
  }
};

const ProductDetailsScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { getThemeColors } = useTheme();
  const colors = getThemeColors();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const { productId, type } = route.params;
  const [currentUser, setCurrentUser] = useState(null);
  const [isMessaging, setIsMessaging] = useState(false);

  const [product, setProduct] = useState(null);
  const [sellerName, setSellerName] = useState('Unknown');
  const [isLoading, setIsLoading] = useState(true);
  const [productImages, setProductImages] = useState([]);
  const flatListRef = useRef(null);
  const [seller, setSeller] = useState(null);
  const [error, setError] = useState(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      try {
        const { user, isNetworkError, error } = await checkAuthenticationWithFallback();
        if (user) {
          setCurrentUser(user);
        }
        // Don't show network errors for user check in product details
        // Just silently fail and continue without user data
      } catch (error) {
        console.log('User check failed:', error);
        // Continue without user data
      }
    };
    getUser();
  }, []);

  // First, declare the fetchProductDetails function at the component level
  const fetchProductDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check network connectivity first
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        throw new Error('No internet connection');
      }

      // Direct query to ensure we get fresh data
      const { data: freshProduct, error } = await supabase
        .from(type === 'buy' ? 'buy_orders' : 'products')
        .select('*, profiles(*)')
        .eq('id', productId)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        throw error;
      }
      
      if (!freshProduct) {
        console.error('Product not found');
        throw new Error('Product not found');
      }

      // Process images using the EXACT same approach as HomeScreen.js
      let allPhotos = [];
      
      // Process main image - SIMPLE HomeScreen approach
      if (freshProduct.main_image_url) {
        
        // Get photo URL - DIRECTLY copying HomeScreen.js approach
        const { data } = supabase.storage
          .from(type === 'buy' ? 'buy-orders-images' : 'product_images')
          .getPublicUrl(freshProduct.main_image_url);
        
        const photoUrl = data?.publicUrl;
        
        if (photoUrl) {
          // Add cache-busting
          const mainImageUrl = `${photoUrl}?t=${Date.now()}`;
          
          allPhotos.push({ 
            url: mainImageUrl,
            isMainPhoto: true
          });
        }
      }

      // Process additional images with same approach
      if (freshProduct.images && Array.isArray(freshProduct.images)) {
        
        for (const imagePath of freshProduct.images) {
          // Skip empty paths or the main image path
          if (!imagePath || imagePath === freshProduct.main_image_url) continue;
          
          // Get photo URL - EXACTLY like HomeScreen
          const { data } = supabase.storage
            .from(type === 'buy' ? 'buy-orders-images' : 'product_images')
            .getPublicUrl(imagePath);
          
          const photoUrl = data?.publicUrl;
          
          if (photoUrl) {
            // Add cache-busting
            const imageUrl = `${photoUrl}?t=${Date.now()}`;
            
            // Only add if not a duplicate
            if (!allPhotos.some(photo => photo.url.split('?')[0] === imageUrl.split('?')[0])) {
              allPhotos.push({ url: imageUrl });
            }
          }
        }
      }

      // If we still have no images, add a placeholder
      if (allPhotos.length === 0) {

        allPhotos.push({ 
          isPlaceholder: true 
        });
      }
      
      // Update state with fresh data
      setProductImages(allPhotos);
      setProduct({
        ...freshProduct,
        processedImages: allPhotos
      });
      setSellerName(freshProduct.profiles?.username || 'Unknown');
      setSeller(freshProduct.profiles);

    } catch (error) {
      console.error('Error fetching product details:', error);
      
      // Check if it's a network error
      if (error.message?.includes('network') || 
          error.message?.includes('No internet connection') ||
          error.message?.includes('fetch') ||
          error.message?.includes('timeout') ||
          error.message?.includes('connection')) {
        setError(new Error('Network error - please check your connection'));
      } else {
        setError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Then use it in useEffect
  useEffect(() => {
    fetchProductDetails();
  }, [productId, type]);

  // Update the header options in useEffect:
  useEffect(() => {
    if (!seller) return; // Don't update header until we have seller data

    navigation.setOptions({
      headerShown: true,
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <Image
            source={
              seller.avatar_url
                ? { uri: getAvatarUrl(seller.avatar_url) }
                : require('../../assets/default-avatar.png')
            }
            style={styles.headerAvatar}
            defaultSource={require('../../assets/default-avatar.png')}
          />
          <Text style={[styles.headerText, { color: colors.headerText }]}>{sellerName}</Text>
        </View>
      ),
      headerLeft: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.headerText} />
        </TouchableOpacity>
      ),
      headerRight: () => null,
      headerStyle: {
        backgroundColor: colors.headerBackground,
        elevation: Platform.OS === 'android' ? 2 : 0,
        shadowOpacity: Platform.OS === 'ios' ? 0.3 : 0,
        shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 2 } : undefined,
      },
      headerTintColor: colors.headerText,
    });
  }, [navigation, seller, sellerName, fetchProductDetails, colors]);

  // Handle messaging the seller
  const handleMessageSeller = async () => {
    try {
      if (isMessaging) return; // Prevent multiple clicks
      
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        throw new Error('network');
      }

      if (!currentUser) {
        Alert.alert(t('Sign In Required'), t('You must be logged in to message sellers'));
        navigation.navigate('Login');
        return;
      }
      
      // Can't message yourself
      if (currentUser.id === product.seller_id) {
        Alert.alert(t('Cannot Message Yourself'), t('Self message error'));
        return;
      }
      
      // Prepare product info for the chat
      try {
        setIsMessaging(true);
        
        const productInfo = {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          dorm: product.dorm,
          type: 'product',
          mainImage: productImages[0]?.url || null,
          totalImages: productImages.length
        };

        // Navigate to chat without creating conversation yet
        navigation.navigate('Chat', {
          otherUserId: product.seller_id,
          otherUserName: seller?.username || t('Seller'),
          productInfo
        });
      } catch (error) {
        if (error.code === ERROR_CODES.UNAUTHORIZED) {
          Alert.alert(
            t('Authentication Required'),
            t('Please log in to message sellers'),
            [
              { 
                text: t('Log In'), 
                onPress: () => navigation.navigate('Login') 
              }
            ]
          );
        } else if (error.code === ERROR_CODES.PERMISSION_DENIED) {
          // This is a database permissions error
          Alert.alert(
            t('Permission Error'),
            t('You do not have permission to message this seller. This may be due to database security rules.'),
            [{ text: t('OK') }]
          );
        } else {
          Alert.alert(
            t('Error'),
            t('Could not start conversation with seller. Please try again.'),
            [{ text: t('OK') }]
          );
        }
      } finally {
        setIsMessaging(false);
      }
    } catch (error) {
      handleProductError(error, t, 'CONTACT_SELLER');
    } finally {
      setIsMessaging(false);
    }
  };

  // Add phone call handler:
  const handlePhoneCall = () => {
    if (seller?.phone_number) {
      const phoneUrl = `tel:${seller.phone_number}`;
      Linking.canOpenURL(phoneUrl)
        .then(supported => {
          if (supported) {
            return Linking.openURL(phoneUrl);
          }
          Alert.alert(t('error'), t('phoneCallsNotSupported'));
        })
        .catch(err => console.error('Error opening phone app:', err));
    }
  };

  // Refresh on screen focus 
  useFocusEffect(
    React.useCallback(() => {
      // Refresh both images and product data when screen gets focus
      fetchProductDetails();
      
      return () => {
        // This runs when screen loses focus
      };
    }, [])
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('Loading...')}</Text>
        </View>
      );
    }

    if (!product) {
      return (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>{t('Product not found')}</Text>
        </View>
      );
    }

    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Photo Carousel */}
        <View style={[styles.photoCarouselContainer, { backgroundColor: colors.card }]}>
          {productImages && productImages.length > 0 ? (
            <FlatList
              data={productImages}
              renderItem={({ item, index }) => {

                
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setCurrentPhotoIndex(index);
                      setModalVisible(true);
                    }}
                    style={styles.photoItemContainer}
                  >
                    {item.isPlaceholder ? (
                      <Image
                        source={require('../../assets/placeholder.png')}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Image
                        key={`main-image-${Date.now()}-${index}`}
                        source={{ uri: item.url }}
                        style={styles.productImage}
                        resizeMode="cover"
                        onError={(e) => {
                          console.error(`Image load error:`, e.nativeEvent.error);
                        }}
                      />
                    )}
                    {index < productImages.length - 1 && (
                      <View style={styles.nextImagePeek}>
                        {productImages[index + 1].isPlaceholder ? (
                          <Image
                            source={require('../../assets/placeholder.png')}
                            style={styles.peekImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <Image
                            key={`peek-image-${Date.now()}-${index}`}
                            source={{ uri: productImages[index + 1].url }}
                            style={styles.peekImage}
                            resizeMode="cover"
                          />
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              horizontal
              pagingEnabled
              snapToInterval={width}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `${index}-${Date.now()}`}
              onViewableItemsChanged={({ viewableItems }) => {
                if (viewableItems.length > 0) {
                  setCurrentPhotoIndex(viewableItems[0].index);
                }
              }}
            />
          ) : (
            <Image
              source={require('../../assets/placeholder.png')}
              style={styles.productImage}
              resizeMode="cover"
            />
          )}

          {productImages && productImages.length > 1 && (
            <View style={[styles.photoCounterContainer, { backgroundColor: colors.overlay }]}>
              <Text style={[styles.photoCounterText, { color: colors.headerText }]}>
                {currentPhotoIndex + 1}/{productImages.length}
              </Text>
            </View>
          )}

          {productImages && productImages.length > 0 && (
            <TouchableOpacity
              style={[styles.imageZoomButton, { backgroundColor: colors.overlay }]}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="expand" size={24} color={colors.headerText} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.detailsContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.productName, { color: colors.text }]}>{product?.name || t('No name available')}</Text>

          <View style={styles.priceContainer}>
            <Text style={[styles.price, { color: colors.primary }]}>
              ₽{Math.round(product?.price || 0)}
            </Text>
            <Text style={[styles.seller, { color: colors.textSecondary }]}>
              {t('Posted by {{name}}', { name: sellerName })}
            </Text>
          </View>

          <View style={[styles.locationInfo, { backgroundColor: colors.surface }]}>
            <Ionicons name="location" size={20} color={colors.textSecondary} />
            <Text style={[styles.dormText, { color: colors.text }]}>
              {product?.dorm || t('Location not specified')}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.descriptionTitle, { color: colors.text }]}>{t('About this item')}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {product?.description || t('No description available')}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.contactTitle, { color: colors.text }]}>{t('Contact Options')}</Text>
          <View style={styles.contactButtonsContainer}>
            <TouchableOpacity
              style={[styles.contactButton, styles.messageButton, { backgroundColor: colors.primary }]}
              onPress={handleMessageSeller}
              disabled={isMessaging}
            >
              {isMessaging ? (
                <ActivityIndicator size="small" color={colors.headerText} />
              ) : (
                <>
                  <Ionicons name="chatbubble" size={22} color={colors.headerText} />
                  <Text style={[styles.contactButtonText, { color: colors.headerText }]}>{t('Message')}</Text>
                </>
              )}
            </TouchableOpacity>

            {seller?.allow_phone_contact && seller?.phone_number && (
              <TouchableOpacity
                style={[styles.contactButton, styles.callButton, { backgroundColor: colors.secondary }]}
                onPress={handlePhoneCall}
              >
                <Ionicons name="call" size={22} color={colors.headerText} />
                <Text style={[styles.contactButtonText, { color: colors.headerText }]}>{t('Call')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  // Photo full screen modal with aggressive image loading
  const renderPhotoModal = () => {
    if (!modalVisible) return null;

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOuterContainer}>
          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={() => setModalVisible(false)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>

          <View style={styles.modalControls}>
            {currentPhotoIndex > 0 && (
              <TouchableOpacity 
                style={styles.modalArrow}
                onPress={() => setCurrentPhotoIndex(prev => prev - 1)}
              >
                <Ionicons name="chevron-back" size={40} color="#fff" />
              </TouchableOpacity>
            )}

            <View style={styles.modalImageWrapper}>
              {productImages && productImages[currentPhotoIndex] && (
                productImages[currentPhotoIndex].isPlaceholder ? (
                  <Image
                    source={require('../../assets/placeholder.png')}
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Image
                    key={`modal-image-${Date.now()}-${currentPhotoIndex}`} 
                    source={{ uri: productImages[currentPhotoIndex].url }}
                    style={styles.modalImage}
                    resizeMode="contain"
                    onError={(e) => {
                      console.error(`Modal image load error:`, e.nativeEvent.error);
                    }}
                  />
                )
              )}
            </View>

            {currentPhotoIndex < (productImages?.length || 0) - 1 && (
              <TouchableOpacity 
                style={styles.modalArrow}
                onPress={() => setCurrentPhotoIndex(prev => prev + 1)}
              >
                <Ionicons name="chevron-forward" size={40} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {productImages && productImages.length > 1 && (
            <View style={styles.modalCounter}>
              <Text style={styles.modalCounterText}>
                {currentPhotoIndex + 1}/{productImages.length}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    );
  };

  return (
    <ErrorBoundaryWrapper
      onRetry={fetchProductDetails}
      loadingMessage={t('loadingProduct')}
      errorMessage={error?.message || t('errorLoadingProduct')}
    >
      <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        {isLoading ? (
          <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('loadingProduct')}</Text>
          </View>
        ) : error ? (
          <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
            {error.message?.includes('Network error') ? (
              <>
                <Ionicons name="wifi-outline" size={80} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>{t('noInternet')}</Text>
                <Text style={[styles.errorDescription, { color: colors.textSecondary }]}>{t('checkConnection')}</Text>
              </>
            ) : (
              <Text style={[styles.errorText, { color: colors.error }]}>{t('errorLoadingProduct')}</Text>
            )}
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={fetchProductDetails}
            >
              <Text style={[styles.retryButtonText, { color: colors.headerText }]}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {renderContent()}
            {renderPhotoModal()}
          </>
        )}
      </View> 
    </ErrorBoundaryWrapper>
  );
};

// Your styles stay the same
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  photoCarouselContainer: {
    height: width * 0.85,
    width: width,
    position: 'relative',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    borderTopRightRadius: 25,
    borderTopLeftRadius: 25,
    overflow: 'hidden',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginTop: 2,
    
  },
  photoItemContainer: {
    width: width,
    height: width * 0.85,
    position: 'relative',
    shadowColor: 'red, green',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 9,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  nextImagePeek: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 20,
    overflow: 'hidden',
  },
  peekImage: {
    width: width,
    height: '100%',
    marginLeft: -width + 30,
  },
  photoCounterContainer: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  photoCounterText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  imageZoomButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    borderRadius: 24,
    padding: 10,
  },
  detailsContainer: {
    padding: 20,
    flex: 1,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 15,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  seller: {
    fontSize: 14,
    fontWeight: '500',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 0,
  },
  dormText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  contactButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  messageButton: {
  },
  callButton: {
  },
  contactButtonText: {
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  modalOuterContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  modalControls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  modalArrow: {
    padding: 20,
    zIndex: 20,
  },
  modalImageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 20,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
  },
  modalImage: {
    width: width * 0.85,
    height: height * 0.8,
    resizeMode: 'contain',
  },
  modalCounter: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    zIndex: 20,
  },
  modalCounterText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sellerContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  sellerDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Platform.OS === 'ios' ? -20 : 0,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerButton: {
    paddingHorizontal: 15,
    height: '100%',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProductDetailsScreen;
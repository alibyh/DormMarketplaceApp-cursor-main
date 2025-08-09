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
    console.log(`No image path provided for ${productType} product`);
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
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUser(data.user);
      }
    };
    getUser();
  }, []);

  // First, declare the fetchProductDetails function at the component level
  const fetchProductDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      

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
        console.log("No images found, using placeholder");
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
      setError(error);
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
          <Text style={styles.headerText}>{sellerName}</Text>
        </View>
      ),
      headerLeft: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={fetchProductDetails}
        >
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      ),
      headerStyle: {
        backgroundColor: '#104d59',
        elevation: Platform.OS === 'android' ? 2 : 0,
        shadowOpacity: Platform.OS === 'ios' ? 0.3 : 0,
        shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 2 } : undefined,
      },
      headerTintColor: '#fff',
    });
  }, [navigation, seller, sellerName, fetchProductDetails]);

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
        Alert.alert(t('Cannot Message Yourself'), t('You cannot message yourself'));
        return;
      }
      
      // Create or get conversation with the seller
      try {
        setIsMessaging(true);
        
        const conversation = await findOrCreateConversation(product.seller_id);
        
        // Navigate to chat
        navigation.navigate('Chat', {
          conversationId: conversation.conversation_id,
          otherUserId: product.seller_id,
          otherUserName: seller?.username || t('Seller'),
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
          Alert.alert(t('Error'), t('Phone calls not supported on this device'));
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff5722" />
          <Text style={styles.loadingText}>{t('Loading...')}</Text>
        </View>
      );
    }

    if (!product) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{t('Product not found')}</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.container}>
        {/* Photo Carousel */}
        <View style={styles.photoCarouselContainer}>
          {productImages && productImages.length > 0 ? (
            <FlatList
              data={productImages}
              renderItem={({ item, index }) => {
                console.log(`Rendering image ${index}:`, item.isPlaceholder ? 'placeholder' : item.url.substring(0, 50) + '...');
                
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
                        style={[
                          styles.productImage,
                          item.isMainPhoto && styles.mainProductImage
                        ]}
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
            <View style={styles.photoCounterContainer}>
              <Text style={styles.photoCounterText}>
                {currentPhotoIndex + 1}/{productImages.length}
              </Text>
            </View>
          )}

          {productImages && productImages.length > 0 && (
            <TouchableOpacity
              style={styles.imageZoomButton}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="expand" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.productName}>{product?.name || t('No name available')}</Text>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {t('₽{{price}}', { price: product?.price || 0 })}
            </Text>
            <Text style={styles.seller}>
              {t('Posted by {{name}}', { name: sellerName })}
            </Text>
          </View>

          <View style={styles.locationInfo}>
            <Ionicons name="location" size={20} color="#666" />
            <Text style={styles.dormText}>
              {product?.dorm || t('Location not specified')}
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.descriptionTitle}>{t('About this item')}</Text>
          <Text style={styles.description}>
            {product?.description || t('No description available')}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.contactTitle}>{t('Contact Optionssss')}</Text>
          <View style={styles.contactButtonsContainer}>
            <TouchableOpacity
              style={[styles.contactButton, styles.messageButton]}
              onPress={handleMessageSeller}
              disabled={isMessaging}
            >
              {isMessaging ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="chatbubble" size={22} color="#fff" />
                  <Text style={styles.contactButtonText}>{t('Message')}</Text>
                </>
              )}
            </TouchableOpacity>

            {seller?.allow_phone_contact && seller?.phone_number && (
              <TouchableOpacity
                style={[styles.contactButton, styles.callButton]}
                onPress={handlePhoneCall}
              >
                <Ionicons name="call" size={22} color="#fff" />
                <Text style={styles.contactButtonText}>{t('Call')}</Text>
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
      <View style={styles.mainContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ff5722" />
            <Text style={styles.loadingText}>{t('loadingProduct')}</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{t('errorLoadingProduct')}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchProductDetails}
            >
              <Text style={styles.retryButtonText}>{t('retry')}</Text>
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
    backgroundColor: 'white',
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
    color: '#666',
    fontWeight: '500',
  },
  photoCarouselContainer: {
    height: width * 0.85,
    width: width,
    position: 'relative',
    backgroundColor: '#104d59',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    borderTopRightRadius: 25,
    borderTopLeftRadius: 25,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
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
  },
  productImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  photoCounterText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  imageZoomButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 24,
    padding: 10,
  },
  detailsContainer: {
    padding: 20,
    backgroundColor: '#fff',
    flex: 1,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ff5722',
  },
  seller: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  dormText: {
    marginLeft: 8,
    fontSize: 15,
    color: '#444',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 20,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  messageButton: {
    backgroundColor: 'red',
  },
  callButton: {
    backgroundColor: '#2196F3',
  },
  contactButtonText: {
    color: 'red',
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
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e1e1e1',
  },
  headerButton: {
    paddingHorizontal: 15,
    height: '100%',
    justifyContent: 'center',
  },
  mainProductImage: {
    borderWidth: 2,
    borderColor: '#ff5722',  // Bright orange border for main image
  },
});

export default ProductDetailsScreen;
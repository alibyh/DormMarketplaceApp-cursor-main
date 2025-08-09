import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
  FlatList,
  Platform,
  Modal,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import supabase from '../../services/supabaseConfig';
import { findOrCreateConversation } from '../../services/messageService';
import ErrorBoundaryWrapper from '../../components/ErrorBoundary/ErrorBoundaryWrapper';
import { handleBuyOrderError } from '../../utils/buyOrderErrorHandler';
import { checkNetworkConnection } from '../../utils/networkUtils';

const getAvatarUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return supabase.storage
    .from('avatars')
    .getPublicUrl(url)?.data?.publicUrl;
};

const { width, height } = Dimensions.get('window');

const BuyOrderDetails = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { productId } = route.params;
  const [order, setOrder] = useState(null);
  const [buyerName, setBuyerName] = useState('Unknown');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [orderImages, setOrderImages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMessaging, setIsMessaging] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [allowPhoneContact, setAllowPhoneContact] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(null);
  const [error, setError] = useState(null);

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        throw new Error('network');
      }


      // First fetch the buy order
      const { data: orderData, error: orderError } = await supabase
        .from('buy_orders')
        .select('*')
        .eq('id', productId)
        .single();

      if (orderError) throw orderError;

      // Then fetch the profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url, allow_phone_contact, phone_number')
        .eq('id', orderData.user_id)
        .single();

      if (profileError) throw profileError;

      console.log('Buy order data:', {
        id: orderData.id,
        main_image_url: orderData.main_image_url,
        image_count: orderData.images?.length || 0
      });

      setOrder({
        id: orderData.id,
        name: orderData.name,
        description: orderData.description,
        dorm: orderData.dorm,
        user_id: orderData.user_id,
        created_at: orderData.created_at,
        buyer_avatar_url: profileData.avatar_url,
        main_image_url: orderData.main_image_url
      });

      // Update profile related states
      setBuyerName(profileData.username || 'Unknown User');
      setAllowPhoneContact(profileData.allow_phone_contact || false);
      setPhoneNumber(profileData.phone_number);

      // Process images - start with main image if exists
      let processedImages = [];
      
      // Add main image first if it exists
      if (orderData.main_image_url) {
        console.log('Processing main image:', orderData.main_image_url);
        const mainImageUrl = supabase.storage
          .from('buy-orders-images')
          .getPublicUrl(orderData.main_image_url);
        
        if (mainImageUrl?.data?.publicUrl) {
          processedImages.push({
            url: `${mainImageUrl.data.publicUrl}?t=${Date.now()}`,
            isMainPhoto: true
          });
          console.log('Added main image:', mainImageUrl.data.publicUrl);
        }
      }

      // Add additional images
      if (orderData.images && orderData.images.length > 0) {
        console.log(`Processing ${orderData.images.length} additional images`);
        const additionalImages = orderData.images
          .filter(imageUrl => imageUrl !== orderData.main_image_url) // Skip main image if it's in the array
          .map(imageUrl => {
            const publicUrl = supabase.storage
              .from('buy-orders-images')
              .getPublicUrl(imageUrl);
            
            if (publicUrl?.data?.publicUrl) {
              return {
                url: `${publicUrl.data.publicUrl}?t=${Date.now()}`
              };
            }
            return null;
          })
          .filter(Boolean); // Remove null entries
        
        processedImages = [...processedImages, ...additionalImages];
      }
      
      console.log(`Total processed images: ${processedImages.length}`);
      setOrderImages(processedImages);

    } catch (error) {
      setError(error);
      handleBuyOrderError(error, t, 'FETCH_ORDER');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [productId, navigation, t]);

  useFocusEffect(
    useCallback(() => {
      console.log('BuyOrderDetails screen focused - refreshing data');
      fetchOrderDetails();
    }, [])
  );

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <Image
            source={
              order?.buyer_avatar_url
                ? { uri: getAvatarUrl(order.buyer_avatar_url) }
                : require('../../assets/default-avatar.png')
            }
            style={styles.headerAvatar}
            defaultSource={require('../../assets/default-avatar.png')}
            accessibilityLabel={t('buyerAvatar')}
          />
          <Text style={styles.headerText}>{buyerName}</Text>
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
      headerStyle: {
        backgroundColor: '#104d59',
        elevation: Platform.OS === 'android' ? 2 : 0,
        shadowOpacity: Platform.OS === 'ios' ? 0.3 : 0,
        shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 2 } : undefined,
      },
      headerTintColor: '#fff',
    });
  }, [navigation, order, buyerName]);

  const handleMessage = async () => {
    try {
      if (isMessaging) return;
      setIsMessaging(true);
      
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        throw new Error('network');
      }

      
      if (!currentUser) {
        console.log("No current user, redirecting to login");
        Alert.alert(t('Sign In Required'), t('You must be logged in to message'));
        navigation.navigate('Login');
        return;
      }
      
      if (currentUser.id === order.user_id) {
        console.log("User attempting to message themselves");
        Alert.alert(t('Cannot Message Yourself'), t('This is your own listing'));
        return;
      }

      const conversation = await findOrCreateConversation(order.user_id);
      
      navigation.navigate('Chat', {
        conversationId: conversation.id,
        otherUserId: order.user_id,
        otherUserName: buyerName
      });

    } catch (error) {
      handleBuyOrderError(error, t, 'CONTACT_ERROR');
    } finally {
      setIsMessaging(false);
    }
  };

  const handlePhoneCall = () => {
    if (phoneNumber) {
      const phoneUrl = `tel:${phoneNumber}`;
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

  const renderImageModal = () => (
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setModalVisible(false)}
      statusBarTranslucent={true}
    >
      <View style={styles.modalOuterContainer}>
        <TouchableOpacity
          style={styles.closeModalButton}
          onPress={() => setModalVisible(false)}
        >
          <Ionicons name="close" size={30} color="#fff" />
        </TouchableOpacity>

        <View style={styles.modalControls}>
          {selectedImageIndex > 0 && (
            <TouchableOpacity
              style={styles.modalArrow}
              onPress={() => setSelectedImageIndex(prev => prev - 1)}
            >
              <Ionicons name="chevron-back" size={40} color="#fff" />
            </TouchableOpacity>
          )}

          <View style={styles.modalImageWrapper}>
            <Image
              source={{ 
                uri: orderImages[selectedImageIndex]?.url 
              }}
              style={styles.modalImage}
              resizeMode="contain"
              onError={(e) => console.error('Image loading error:', e.nativeEvent.error)}
            />
          </View>

          {selectedImageIndex < orderImages.length - 1 && (
            <TouchableOpacity
              style={styles.modalArrow}
              onPress={() => setSelectedImageIndex(prev => prev + 1)}
            >
              <Ionicons name="chevron-forward" size={40} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.modalCounter}>
          <Text style={styles.modalCounterText}>
            {selectedImageIndex + 1}/{orderImages.length}
          </Text>
        </View>
      </View>
    </Modal>
  );

  return (
    <ErrorBoundaryWrapper
      onRetry={fetchOrderDetails}
      loadingMessage={t('loadingOrder')}
      errorMessage={error?.message || t('errorLoadingOrder')}
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff5722" />
          <Text style={styles.loadingText}>{t('loadingOrder')}</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('errorLoadingOrder')}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchOrderDetails}
          >
            <Text style={styles.retryButtonText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.container}>
          <View style={styles.photoCarouselContainer}>
            <FlatList
              data={orderImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentPhotoIndex(newIndex);
              }}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={styles.photoItemContainer}
                  onPress={() => {
                    setSelectedImageIndex(index);
                    setModalVisible(true);
                  }}
                >
                  <Image
                    source={{ uri: item.url }}
                    style={styles.productImage}
                    resizeMode="cover"
                    onError={(e) => console.error('Image loading error:', e.nativeEvent.error)}
                  />
                </TouchableOpacity>
              )}
              keyExtractor={(_, index) => index.toString()}
              ListEmptyComponent={() => (
                <View style={styles.photoItemContainer}>
                  <Image
                    source={{ uri: 'https://via.placeholder.com/350' }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                </View>
              )}
            />
            {orderImages.length > 1 && (
              <View style={styles.photoCounterContainer}>
                <Text style={styles.photoCounterText}>
                  {currentPhotoIndex + 1}/{orderImages.length}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.orderTypeContainer}>
              <Text style={styles.orderTypeLabel}>{t('Want to Buy')}</Text>
            </View>

            <Text style={styles.productName}>{order.name}</Text>

            <View style={styles.buyerInfo}>
              <Text style={styles.postedBy}>
                {t('Posted by {{name}}', { name: buyerName })}
              </Text>
            </View>

            <View style={styles.locationInfo}>
              <Ionicons name="location" size={20} color="#666" />
              <Text style={styles.dormText}>{order.dorm}</Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.descriptionTitle}>{t('Looking for')}</Text>
            <Text style={styles.description}>{order.description}</Text>

            <View style={styles.divider} />

            <Text style={styles.contactTitle}>{t('Contact Options')}</Text>
            <View style={styles.contactButtonsContainer}>
              <TouchableOpacity
                style={[styles.contactButton, styles.messageButton]}
                onPress={handleMessage}
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
              
              {allowPhoneContact && phoneNumber && (
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
          {renderImageModal()}
        </ScrollView>
      )}
    </ErrorBoundaryWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#ff5722',
  },
  photoCarouselContainer: {
    height: width * 0.85,
    width: width,
    position: 'relative',
    backgroundColor: '#f0f0f0', // Changed from #104d59 to better show loading state
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    margin:2,
    marginTop: 2,
    marginBottom: 10,
  },
  photoItemContainer: {
    width: width,
    height: width * 0.85,
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  productImage: {
    width: width,
    height: '100%',
    backgroundColor: '#f0f0f0',
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
  buyerInfo: {
    marginVertical: 10,
  },
  postedBy: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#4CAF50',
  },
  callButton: {
    backgroundColor: '#2196F3',
    marginLeft: 10,
  },
  contactButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  orderTypeContainer: {
    backgroundColor: '#104d59',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  orderTypeLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Platform.OS === 'ios' ? -20 : 0,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e1e1e1',
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  headerButton: {
    paddingHorizontal: 15,
    height: '100%',
    justifyContent: 'center',
  },
  modalOuterContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    width: width,
    height: height * 0.7,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#ff5722',
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default BuyOrderDetails;
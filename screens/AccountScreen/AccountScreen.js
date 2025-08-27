import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  SafeAreaView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import BlockedUsersScreen from '../BlockedUsersScreen/BlockedUsersScreen';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import supabase from '../../services/supabaseConfig';
import ErrorBoundaryWrapper from '../../components/ErrorBoundary/ErrorBoundaryWrapper';
import LoadingState from '../../components/LoadingState/LoadingState';
import RetryView from '../../components/RetryView/RetryView';
import { checkAuthenticationWithFallback } from '../../utils/authUtils';
import { requestAccountDeletion } from '../../services/accountDeletionService';
import { checkNetworkConnection } from '../../utils/networkUtils';
import notificationService from '../../services/notificationService';
import { deleteProduct } from '../../services/productService';

const cleanStorageUrl = (url) => {
  if (!url) return null;
  
  const baseUrl = 'https://hiqscrnxzgotgieihnzh.supabase.co/storage/v1/object/public/';
  
  // If it's already a clean URL without duplicates, return it
  if (url.startsWith(baseUrl) && !url.includes(`${baseUrl}product_images/${baseUrl}`)) {
    return url;
  }

  // Handle cases where the URL might be just a file path
  if (!url.includes('http')) {
    return `${baseUrl}product_images/${url}`;
  }

  // Extract the path after product_images/
  const matches = url.match(/product_images\/([^?]+)$/);
  if (matches && matches[1]) {
    return `${baseUrl}product_images/${matches[1]}`;
  }

  return url;
};

const ERROR_TYPES = {
  FETCH_PRODUCTS: 'FETCH_PRODUCTS',
  USER: 'USER',
  DELETE: 'DELETE',
  UNKNOWN: 'UNKNOWN'
};

const handleError = (error, context, t) => {
  console.error(`Error in ${context}:`, error);
  let message = '';

  switch (error?.type) {
    case ERROR_TYPES.FETCH_PRODUCTS:
      message = t('errorFetchingProducts');
      break;
    case ERROR_TYPES.USER:
      message = t('userError');
      break;
    case ERROR_TYPES.DELETE:
      message = t('deleteError');
      break;
    default:
      message = error?.message || t('unknownError');
  }

  Alert.alert(
    t('error'),
    message,
    [{ text: t('ok') }]
  );
};

// Add missing handleProfileError function
const handleProfileError = (error, t, type = 'FETCH_PROFILE') => {
  console.error('Profile error:', error);
  let message = '';
  
  switch (type) {
    case 'FETCH_PROFILE':
      message = t('errorLoadingProfile');
      break;
    case 'USER':
      message = t('userError');
      break;
    default:
      message = error?.message || t('unknownError');
  }
  
  Alert.alert(
    t('error'),
    message,
    [{ text: t('ok') }]
  );
};

const AccountScreen = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const { currentTheme, changeTheme, getThemeColors, THEME_TYPES } = useTheme();
  const colors = getThemeColors();
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    profilePicture: null,
    dorm: '',
    phone_number: '',
    allow_phone_contact: false
  });
  const [userId, setUserId] = useState(null);
  const [userProducts, setUserProducts] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [isThemeModalVisible, setIsThemeModalVisible] = useState(false);
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  const [messageNotificationsEnabled, setMessageNotificationsEnabled] = useState(true);
  const [loadingProductIds, setLoadingProductIds] = useState([]);
  const [error, setError] = useState(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Toggle loading state for a specific product
  const setProductLoading = (productId, isLoading) => {
    setLoadingProductIds(prev => 
      isLoading 
        ? [...prev, productId] 
        : prev.filter(id => id !== productId)
    );
  };

  // Check if a product is in loading state
  const isProductLoading = (productId) => {
    return loadingProductIds.includes(productId);
  };

  // Create a profile if none exists
  const createDefaultProfile = async (userId, email) => {
    try {
      
      // Extract username from email (everything before @)
      const defaultUsername = email ? email.split('@')[0] : 'user';
      
      const { data, error } = await supabase
        .from('profiles')
        .upsert([
          {
            id: userId,
            username: defaultUsername,
            email: email, // Include email - it's required
            dorm: '',
            phone_number: '',
            name: defaultUsername,
            surname: '',
            allow_phone_contact: false
          }
        ], { onConflict: 'id' });
        
      if (error) {
        console.error('Error creating default profile:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in createDefaultProfile:', error);
      return false;
    }
  };

  // Fetch User Data
  const fetchUserData = async () => {
    try {
      setError(null);
      setIsNetworkError(false);
      
      const { user, isNetworkError: networkError, error: userError } = await checkAuthenticationWithFallback();
      
      if (networkError) {
        // Network error - show network error UI
        console.log('Network error during auth check:', userError);
        setIsNetworkError(true);
        setUserData({
          username: '',
          email: '',
          profilePicture: null,
          dorm: '',
          phone_number: '',
          allow_phone_contact: false
        });
        setUserId(null);
        setIsLoading(false);
        return;
      }
      
      // Handle auth errors gracefully
      if (userError) {
        console.log('Auth error (expected for unauthenticated users):', userError);
        setUserData({
          username: '',
          email: '',
          profilePicture: null,
          dorm: '',
          phone_number: '',
          allow_phone_contact: false
        });
        setUserId(null);
        setIsLoading(false);
        return;
      }
      
      if (!user) {
        // User is not logged in, show sign-in prompt immediately
        setUserData({
          username: '',
          email: '',
          profilePicture: null,
          dorm: '',
          phone_number: '',
          allow_phone_contact: false
        });
        setUserId(null);
        setIsLoading(false);
        return;
      }
      
      if (user) {
        setUserId(user.id);
        
        // Don't set any user data until we have complete profile information
        // This prevents showing partial/empty data while loading
        
        // Check Supabase storage URL for debugging
        try {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl('test.jpg');
        } catch (storageError) {
        }
        
        // Fetch user profile from the profiles table with better error logging
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          // Check if this is a "no rows returned" error, which means the profile doesn't exist
          if (profileError.code === 'PGRST116') {
            // Make this a regular log instead of an error
            
            // Create a default profile since none exists
            const created = await createDefaultProfile(user.id, user.email);
            if (created) {
              // Fetch the newly created profile
              const { data: newProfileData, error: newError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
                
              if (!newError && newProfileData) {
                handleProfileData(newProfileData, user.email, user.user_metadata);
                return;
              }
            }
          }
          return;
        }
        
        if (profileData) {
          console.log('Profile data loaded:', {
            id: profileData.id,
            username: profileData.username,
            avatar_url: profileData.avatar_url,
            email: profileData.email
          });
          handleProfileData(profileData, user.email, user.user_metadata);
        } else {
          console.log('No profile data found for user:', user.id);
          // Set minimal data if no profile exists
          setUserData({
            username: user.user_metadata?.username || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            profilePicture: null,
            dorm: '',
            phone_number: '',
            allow_phone_contact: false
          });
        }
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      // Only show error alerts if user is authenticated
      if (userId) {
        setError(error);
        handleProfileError(error.error, t, error.type || 'FETCH_PROFILE');
      } else {
        // For unauthenticated users, just log the error
        console.log('Profile fetch error for unauthenticated user (expected):', error);
      }
    }
  };
  
  // Helper to process profile data
  const handleProfileData = (profileData, userEmail, userMetadata = {}) => {
    
    // Get all the keys in the profile data
    
    // Try to find similar fields if the exact ones don't exist or are empty
    // First check profile data, then fall back to metadata if available
    const dormValue = profileData.dorm || userMetadata.dorm || '';
    const phoneValue = profileData.phone_number || userMetadata.phone_number || '';
    
    // Username could be in username or could be constructed from name/surname
    let usernameValue = profileData.username || '';
    if (!usernameValue && profileData.name) {
      usernameValue = profileData.name + (profileData.surname ? ' ' + profileData.surname : '');
    }
    if (!usernameValue && userMetadata.username) {
      usernameValue = userMetadata.username;
    }
    if (!usernameValue && userMetadata.name) {
      usernameValue = userMetadata.name + (userMetadata.surname ? ' ' + userMetadata.surname : '');
    }
    
    // Profile picture handling
    let profilePicValue = null;
    
    // Check if avatar_url exists in profile data
    if (profileData.avatar_url) {
      profilePicValue = profileData.avatar_url;
      console.log('Profile photo loaded successfully:', profilePicValue);
    }
    
    // If no URL from profile, try metadata
    if (!profilePicValue && userMetadata && userMetadata.avatar_url) {
      profilePicValue = userMetadata.avatar_url;
      console.log('Profile photo loaded from metadata:', profilePicValue);
    }
    
    
    // Set user data with improved profile picture handling
    setUserData({
      username: usernameValue,
      email: profileData.email || userEmail || '',
      profilePicture: profilePicValue,
      dorm: dormValue,
      phone_number: phoneValue,
      allow_phone_contact: profileData.allow_phone_contact || userMetadata.allow_phone_contact || false
    });
  };
  
  // Helper to validate image URLs
  const isValidImageUrl = (url) => {
    if (!url) return false;
    
    
    // Check if it's an absolute URL that needs a protocol
    if (url.startsWith('//')) {
      url = 'https:' + url;
    }
    
    // Check if it's a relative URL that needs the Supabase storage URL prefix
    if (url.startsWith('/') || (!url.startsWith('http') && !url.startsWith('data:'))) {
      console.log('URL appears to be relative, might need the storage URL prefix');
      
      try {
        // Try to get the Supabase storage URL for this path
        let fullUrl = null;
        try {
          const result = supabase.storage.from('avatars').getPublicUrl(url.replace(/^\//, ''));
          if (result && result.data && result.data.publicUrl) {
            fullUrl = result.data.publicUrl;
          }
        } catch (storageError) {
          console.log('Error getting public URL:', storageError);
        }
        
        if (fullUrl) {
          return fullUrl;
        }
      } catch (e) {
        console.log('Failed to convert to Supabase URL:', e);
        return false;
      }
    }
    
    // Basic validation that it's a URL format
    const isValid = url.startsWith('http') || url.startsWith('https') || url.startsWith('data:');
    return isValid;
  };

  // Fetch User Products
  const fetchUserProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      // If there's an auth error or no user, just return without throwing
      if (userError || !user) {
        setUserProducts([]);
        setIsLoading(false);
        return;
      }

      // Fetch both products and buy orders
      const [productsResponse, buyOrdersResponse] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('buy_orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      if (productsResponse.error) throw productsResponse.error;
      if (buyOrdersResponse.error) throw buyOrdersResponse.error;

      // Process and combine both types of listings
      const processedProducts = productsResponse.data.map(product => ({
        ...product,
        type: 'sell',
        main_image_url: getImageUrl(product.main_image_url, 'product_images'),
        images: (product.images || []).map(img => getImageUrl(img, 'product_images'))
      }));

      const processedBuyOrders = buyOrdersResponse.data.map(order => ({
        ...order,
        type: 'buy',
        main_image_url: getImageUrl(order.main_image_url, 'buy-orders-images'),
        images: (order.images || []).map(img => getImageUrl(img, 'buy-orders-images'))
      }));

      // Combine and sort by creation date
      const allListings = [...processedProducts, ...processedBuyOrders]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setUserProducts(allListings);
      
    } catch (error) {
      console.error('Fetch products error:', error);
      // Don't show error alerts for auth-related issues when user is not logged in
      if (!userId) {
        setUserProducts([]);
      } else {
        handleError(error, 'fetchUserProducts', t);
        setError(error);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t, userId]);

  // Helper function to get the correct image URL
  const getImageUrl = (path, bucket) => {
    if (!path) return null;
    return supabase.storage
      .from(bucket)
      .getPublicUrl(path)
      .data?.publicUrl;
  };

  // Handle Refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchUserData();
      // Only fetch products if user is authenticated
      if (userId) {
        await fetchUserProducts();
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [userId]);

  // Retry function specifically for network errors
  const handleNetworkRetry = useCallback(async () => {
    try {
      
      setIsNetworkError(false);
      setIsLoading(true);
      setError(null);
      
      // Just check network and retry user data fetch
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        setIsNetworkError(true);
        setIsLoading(false);
        return;
      }
      
      // If network is back, try to fetch user data
      await fetchUserData();
      if (userId) {
        await fetchUserProducts();
      }

    } catch (error) {
      console.error('AccountScreen: Network retry failed:', error);
      setIsNetworkError(true);
      setIsLoading(false);
    }
  }, [userId, fetchUserData, fetchUserProducts]);

  // Load saved language preference
  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('userLanguage');
        if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ru')) {
          i18n.changeLanguage(savedLanguage);
        }
      } catch (error) {
        console.error('Error loading saved language:', error);
      }
    };

    loadSavedLanguage();
  }, [i18n]);

  // Load notification preferences
  useEffect(() => {
    const loadNotificationPreferences = async () => {
      try {
        const savedNotificationPreference = await AsyncStorage.getItem('messageNotificationsEnabled');
        if (savedNotificationPreference !== null) {
          setMessageNotificationsEnabled(savedNotificationPreference === 'true');
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      }
    };

    loadNotificationPreferences();
  }, []);

  // Initial Data Load
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        await fetchUserData();
        // fetchUserData will set userId if user is authenticated
        // We'll handle product fetching in a separate useEffect
      } catch (error) {
        console.error('Initial load error:', error);
        // Even if there's an error, we should stop loading
        setIsLoading(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
    
    // Subscribe to auth changes but don't navigate
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Navigation is handled by App.js auth state
      }
    });
    
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Fetch products when userId is available
  useEffect(() => {
    if (userId) {
      fetchUserProducts();
    }
  }, [userId, fetchUserProducts]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Check auth status when screen comes into focus
      fetchUserData();
      
      // Check route.params instead of using getParam
      if (route?.params?.refresh && userId) {
        fetchUserProducts();
        // Clear the refresh parameter
        navigation.setParams({ refresh: null });
      }
    });

    return unsubscribe;
  }, [navigation, fetchUserProducts, userId]);

  // Logout Handler - Updated to include option for account deletion
  const handleLogout = async () => {
    Alert.alert(
      t('confirmLogout'),
              t('areYouSureLogout'),
      [
        {
          text: t('Cancel'),
          style: 'cancel'
        },
        {
                      text: t('logout'),
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              
              // Clear local state
              setUserData({
                username: '',
                email: '',
                profilePicture: null,
                dorm: '',
                phone_number: '',
                allow_phone_contact: false
              });
              setUserId(null);
              setUserProducts([]);
              
              // Navigate to home screen and prevent back navigation
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
              
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert(
                t('error'),
                                  t('failedToLogout'),
                                  [{ text: t('ok') }]
              );
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  // Delete Account Handler
  const handleDeleteAccount = async () => {
    Alert.alert(
      t('confirmAccountDeletion'),
      t('accountDeletionWarning'),
      [
        {
          text: t('cancel'),
          style: 'cancel'
        },
        {
          text: t('deleteAccount'),
          style: 'destructive',
          onPress: async () => {
            try {
              
              // Show loading state
              setIsDeletingAccount(true);
              
              // Step 1: Delete all user's products and their images
              const { data: userProducts, error: fetchError } = await supabase
                .from('products')
                .select('id, main_image_url, images')
                .eq('seller_id', userId);
              
              if (fetchError) {
                console.error('Error fetching user products:', fetchError);
                // Don't throw error if no products found - this is normal
                if (fetchError.code !== 'PGRST116') { // No rows returned
                  throw fetchError;
                }
              }
              
              if (userProducts && userProducts.length > 0) {
                // Delete all product images from storage
                for (const product of userProducts) {
                  const imagesToDelete = [
                    ...(product.main_image_url ? [product.main_image_url] : []),
                    ...(product.images || [])
                  ];
                  
                  for (const imagePath of imagesToDelete) {
                    if (imagePath) {
                      const { error: deleteImageError } = await supabase.storage
                        .from('product_images')
                        .remove([imagePath]);
                        
                      if (deleteImageError) {
                        console.error('Error deleting product image:', deleteImageError);
                      }
                    }
                  }
                }
                
                // Delete all products from database
                const { error: deleteProductsError } = await supabase
                  .from('products')
                  .delete()
                  .eq('seller_id', userId);
                  
                if (deleteProductsError) {
                  console.error('Error deleting products:', deleteProductsError);
                  throw deleteProductsError;
                }
                
              } else {
              }
              
              // Step 2: Delete all user's buy orders and their images
              const { data: userBuyOrders, error: fetchBuyOrdersError } = await supabase
                .from('buy_orders')
                .select('id, main_image_url, images')
                .eq('user_id', userId);
              
              if (fetchBuyOrdersError) {
                console.error('Error fetching user buy orders:', fetchBuyOrdersError);
                // Don't throw error if no buy orders found - this is normal
                if (fetchBuyOrdersError.code !== 'PGRST116') { // No rows returned
                  throw fetchBuyOrdersError;
                }
              }
              
              if (userBuyOrders && userBuyOrders.length > 0) {
                // Delete all buy order images from storage
                for (const buyOrder of userBuyOrders) {
                  const imagesToDelete = [
                    ...(buyOrder.main_image_url ? [buyOrder.main_image_url] : []),
                    ...(buyOrder.images || [])
                  ];
                  
                  for (const imagePath of imagesToDelete) {
                    if (imagePath) {
                      const { error: deleteImageError } = await supabase.storage
                        .from('buy-orders-images')
                        .remove([imagePath]);
                        
                      if (deleteImageError) {
                        console.error('Error deleting buy order image:', deleteImageError);
                      }
                    }
                  }
                }
                
                // Delete all buy orders from database
                const { error: deleteBuyOrdersError } = await supabase
                  .from('buy_orders')
                  .delete()
                  .eq('user_id', userId);
                  
                if (deleteBuyOrdersError) {
                  console.error('Error deleting buy orders:', deleteBuyOrdersError);
                  throw deleteBuyOrdersError;
                }
                
              } else {
              }
              
              // Step 3: Delete user's profile picture if exists
              if (userData.profilePicture) {
                const { error: deleteProfilePicError } = await supabase.storage
                  .from('avatars')
                  .remove([userData.profilePicture]);
                  
                if (deleteProfilePicError) {
                  console.error('Error deleting profile picture:', deleteProfilePicError);
                }
              }
              
              // Step 4: Mark account for admin deletion (preserve email and username)

              // Get user email for admin notification
              const { data: { user } } = await supabase.auth.getUser();
              const userEmail = user?.email;
              
              // Mark account for admin deletion (preserves email and username)
              await requestAccountDeletion(userId, userEmail, userData?.username || 'Unknown User');
              
              // Step 5: Clear all local data and sign out
              
              // Clear AsyncStorage
              try {
                await AsyncStorage.clear();
              } catch (error) {
                console.error('Error clearing AsyncStorage:', error);
              }
              
              // Sign out the user
              await supabase.auth.signOut();
              
              
              // Show success message
              Alert.alert(
                t('accountDeleted'),
                t('accountDeletedMessage'),
                [
                  {
                    text: t('ok'),
                    onPress: () => {
                      // Clear local state
                      setUserData({
                        username: '',
                        email: '',
                        profilePicture: null,
                        dorm: '',
                        phone_number: '',
                        allow_phone_contact: false
                      });
                      setUserId(null);
                      setUserProducts([]);
                      
                      // Navigate to home screen and prevent back navigation
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Main' }],
                      });
                    }
                  }
                ]
              );
              
            } catch (error) {
              console.error('Account deletion error:', error);
              setIsDeletingAccount(false);
              
              Alert.alert(
                t('deletionFailed'),
                t('deletionFailedMessage'),
                [{ text: t('ok') }]
              );
            }
          }
        }
      ]
    );
  };

  // Handle Profile Edit
  const handleEditProfile = () => {
    navigation.navigate('UpdateProfile');  // Changed from 'UpdateProfileScreen' to 'UpdateProfile'
  };

  // Handle Add Product
  const handleAddProduct = () => {
    // First check if there's a route named 'AddAd'
    const availableRoutes = navigation.getState().routeNames;
    
    if (availableRoutes.includes('AddAd')) {
      navigation.navigate('AddAd');
    } else if (availableRoutes.includes('PlaceAd')) {
      navigation.navigate('PlaceAd');
    } else {
      console.error('No suitable add product screen found in navigation');
              Alert.alert(t('navigationError'), t('unableToFindAddProductScreen'));
    }
  };

  // Global error handler for API operations
  const handleApiError = (error, operation) => {
    console.error(`Error during ${operation}:`, error);
    
    // Check for specific error types
    if (error.status === 401) {
              Alert.alert(t('authenticationError'), t('pleaseLoginAgain'));
      handleLogout();
      return;
    }
    
    // For all other errors
    Alert.alert(
      t('operationFailed'),
              t('operationFailedMessage', { operation })
    );
  };

  // Toggle Product Visibility
  const toggleProductVisibility = async (productId, currentVisibility) => {
    if (isProductLoading(productId)) return; // Prevent multiple operations
    
    try {
      // Set loading state
      setProductLoading(productId, true);
      
      const newVisibility = !currentVisibility;
      
      // Optimistic UI update
      setUserProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === productId 
            ? { ...product, isVisible: newVisibility } 
            : product
        )
      );
      
      // Skip trying 'active' since we know it doesn't exist
      // Go directly to 'is_visible' which is working
      const { data, error } = await supabase
        .from('products')
        .update({ is_visible: newVisibility })
        .eq('id', productId);
      
      if (error) {
        // Revert optimistic update on error
        setUserProducts(prevProducts => 
          prevProducts.map(product => 
            product.id === productId 
              ? { ...product, isVisible: currentVisibility } 
            : product
          )
        );
        console.error('Error toggling product visibility:', error);
        throw error;
      }
      
      
    } catch (error) {
      handleApiError(error, 'visibility toggle');
    } finally {
      setProductLoading(productId, false);
    }
  };

  // Product Delete Handler
  const handleDeleteProduct = async (productId) => {
    try {
      Alert.alert(
        t('deleteProduct'),
        t('deleteProductConfirmation'),
        [
          {
            text: t('cancel'),
            style: 'cancel'
          },
          {
            text: t('delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                setIsLoading(true);
                setProductLoading(productId, true);

                // 1. First get the product details to get image paths
                const { data: product, error: fetchError } = await supabase
                  .from('products')
                  .select('main_image_url, images')
                  .eq('id', productId)
                  .single();

                if (fetchError) throw fetchError;

                // 2. Delete all images from storage
                if (product) {
                  const imagesToDelete = [
                    ...(product.main_image_url ? [product.main_image_url] : []),
                    ...(product.images || [])
                  ];

                  for (const imagePath of imagesToDelete) {
                    const { error: deleteImageError } = await supabase.storage
                      .from('product_images')
                      .remove([imagePath]);
                      
                    if (deleteImageError) {
                      console.error('Error deleting image:', deleteImageError);
                    }
                  }
                }

                // 3. Delete the product using the service function (hard delete)
                await deleteProduct(productId);
                
                // 4. Trigger conversations refresh to update UI immediately
                try {
                  const { triggerConversationsRefresh } = await import('../../services/messageService');
                  triggerConversationsRefresh();
                  
                  // Also emit a custom event for immediate UI update
                  const { EventRegister } = await import('react-native-event-listeners');
                  EventRegister.emit('PRODUCT_DELETED', { productId });
                  console.log('Emitted PRODUCT_DELETED event from AccountScreen');
                } catch (refreshError) {
                  console.warn('Could not trigger conversations refresh:', refreshError);
                }

                // 4. Update local state
                setUserProducts(prevProducts => 
                  prevProducts.filter(product => product.id !== productId)
                );
                
                Alert.alert(t('success'), t('productDeleted'));

              } catch (error) {
                console.error('Delete product error:', error);
                Alert.alert(t('error'), t('deleteProductError'));
              } finally {
                setIsLoading(false);
                setProductLoading(productId, false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Delete product error:', error);
      Alert.alert(t('error'), t('deleteProductError'));
      setIsLoading(false);
      setProductLoading(productId, false);
    }
  };

  const handleDeleteBuyOrder = async (orderId) => {
    try {
      Alert.alert(
        t('deleteBuyOrder'),
        t('deleteBuyOrderConfirmation'),
        [
          {
            text: t('cancel'),
            style: 'cancel'
          },
          {
            text: t('delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                setIsLoading(true);
                setProductLoading(orderId, true);

                // 1. First get the buy order details to get image paths
                const { data: buyOrder, error: fetchError } = await supabase
                  .from('buy_orders')
                  .select('main_image_url, images')
                  .eq('id', orderId)
                  .single();

                if (fetchError) throw fetchError;

                // 2. Delete all images from storage
                if (buyOrder) {
                  const imagesToDelete = [
                    ...(buyOrder.main_image_url ? [buyOrder.main_image_url] : []),
                    ...(buyOrder.images || [])
                  ];

                  for (const imagePath of imagesToDelete) {
                    const { error: deleteImageError } = await supabase.storage
                      .from('buy-orders-images')
                      .remove([imagePath]);
                      
                    if (deleteImageError) {
                      console.error('Error deleting image:', deleteImageError);
                    }
                  }
                }

                // 3. Use hard delete to save database space
                const { error: deleteError } = await supabase
                  .from('buy_orders')
                  .delete()
                  .eq('id', orderId);

                if (deleteError) throw deleteError;
                
                // 4. Update conversations to mark product as deleted
                try {
                  const { error: convError } = await supabase
                    .from('conversations')
                    .update({ product_deleted: true })
                    .eq('product_id', orderId);
                  
                  if (convError && convError.code !== '42703') {
                    console.warn('Could not update conversations for deleted buy order:', convError);
                  } else {
                    // Trigger conversations refresh to update UI immediately
                    try {
                      const { triggerConversationsRefresh } = await import('../../services/messageService');
                      triggerConversationsRefresh();
                      
                      // Also emit a custom event for immediate UI update
                      const { EventRegister } = await import('react-native-event-listeners');
                      EventRegister.emit('PRODUCT_DELETED', { productId: orderId });
                      console.log('Emitted PRODUCT_DELETED event from buy order deletion');
                    } catch (refreshError) {
                      console.warn('Could not trigger conversations refresh:', refreshError);
                    }
                  }
                } catch (convError) {
                  console.warn('Could not update conversations (column may not exist):', convError);
                }

                // 5. Update local state
                setUserProducts(prevProducts => 
                  prevProducts.filter(product => product.id !== orderId)
                );
                
                Alert.alert(t('success'), t('buyOrderDeleted'));

              } catch (error) {
                console.error('Delete buy order error:', error);
                Alert.alert(t('error'), t('deleteBuyOrderError'));
              } finally {
                setIsLoading(false);
                setProductLoading(orderId, false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Delete buy order error:', error);
      Alert.alert(t('error'), t('deleteBuyOrderError'));
      setIsLoading(false);
      setProductLoading(orderId, false);
    }
  };

  // Language Change Handler
  const handleLanguageChange = async (lang) => {
    try {
    i18n.changeLanguage(lang);
      await AsyncStorage.setItem('userLanguage', lang);
    setIsLanguageModalVisible(false);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  // Theme Change Handler
  const handleThemeChange = (themeType) => {
    changeTheme(themeType);
    setIsThemeModalVisible(false);
  };

  // Notification Change Handler
  const handleNotificationChange = async (enabled) => {
    try {
      setMessageNotificationsEnabled(enabled);
      await AsyncStorage.setItem('messageNotificationsEnabled', enabled ? 'true' : 'false');
      setIsNotificationModalVisible(false);
    } catch (error) {
      console.error('Error saving notification preference:', error);
    }
  };

  // Test notification function
  const testNotification = async () => {
    try {
      await notificationService.sendLocalNotification(
        'Test Notification',
        'This is a test notification from u-Shop SFU!',
        { type: 'test' }
      );
      Alert.alert('Success', 'Test notification sent!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  // Test token saving function
  const testTokenSaving = async () => {
    try {
      await notificationService.saveCurrentToken();
      Alert.alert('Success', 'Push token saved to database!');
    } catch (error) {
      console.error('Error saving token:', error);
      Alert.alert('Error', 'Failed to save push token');
    }
  };



  return (
    <ErrorBoundaryWrapper
      onRetry={handleRefresh}
      loadingMessage={t('loadingProfile')}
      errorMessage={error?.message || t('errorLoadingProfile')}
    >
      {isLoading ? (
        <LoadingState message={t('loadingProfile')} />
      ) : isNetworkError ? (
        <View style={[styles.signInPrompt, { backgroundColor: colors.background }]}>
          <View style={[styles.signInPromptContent, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
            <Ionicons name="wifi-outline" size={80} color={colors.error} />
            <Text style={[styles.signInPromptTitle, { color: colors.text }]}>{t('noInternet')}</Text>
            <Text style={[styles.signInPromptText, { color: colors.textSecondary }]}>
              {t('checkConnection')}
            </Text>
            <TouchableOpacity
              style={[styles.signInPromptButton, { backgroundColor: colors.primary }]}
              onPress={handleNetworkRetry}
            >
              <Text style={[styles.signInPromptButtonText, { color: colors.headerText }]}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : error ? (
        <RetryView 
          onRetry={handleRefresh}
          message={t('errorLoadingProfile')}
        />
      ) : (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.headerBackground }]}>
          <ScrollView
            style={[styles.container, { backgroundColor: colors.surface }]}
            contentContainerStyle={[
              styles.scrollViewContent,
              { paddingTop: 0 } // Remove top padding
            ]}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
                title={t('Pull to refresh')}
                progressViewOffset={Platform.OS === 'ios' ? 100 : 80}
                progressBackgroundColor={colors.background}
              />
            }
          >
            {/* Profile Section */}
            {userId ? (
              <View style={[styles.profileHeader, { backgroundColor: colors.headerBackground }]}>
                <View style={styles.profileImageContainer}>
                  <View style={styles.profileImageContainer}>
                    {userData.profilePicture ? (
                      <Image
                        source={{ uri: userData.profilePicture }}
                        style={styles.profileImage}
                        onError={(e) => {
                          console.error('Profile photo load error:', e.nativeEvent.error);
                          console.error('Failed URL:', userData.profilePicture);
                        }}
                        onLoad={() => {
                          console.log('Profile photo loaded successfully:', userData.profilePicture);
                        }}
                      />
                    ) : (
                      <View style={[styles.profileImage, styles.profileImageFallback, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.profileImageFallbackText, { color: colors.textSecondary }]}>
                          {userData.username ? userData.username.charAt(0).toUpperCase() : '?'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.profileInfoContainer}>
                  {/* Log out button with only icon */}
                  <View style={styles.headerButtons}>
                    <TouchableOpacity
                      style={styles.headerButton}
                      onPress={handleEditProfile}
                      hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    >
                      <View style={[styles.headerButtonContainer, { backgroundColor: colors.overlay }]}>
                        <Ionicons name="create-outline" size={28} color={colors.headerText} />
                      </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.headerButton}
                      onPress={handleLogout}
                      hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    >
                      <View style={[styles.headerButtonContainer, { backgroundColor: colors.overlay }]}>
                        <Ionicons name="log-out-outline" size={28} color={colors.error} />
                      </View>
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={[styles.username, { color: colors.headerText }]}>{userData.username || t('User')}</Text>
                  <Text style={[styles.email, { color: colors.headerText }]}>{userData.email}</Text>
                  
                  {/* Dorm */}
                  <View style={styles.profileDetailRow}>
                    <Ionicons name="home-outline" size={20} color={colors.headerText} style={styles.detailIcon} />
                    <Text style={[styles.profileDetailText, { color: colors.headerText }]}>
                      {userData.dorm || t('No dorm specified')}
                    </Text>
                  </View>
                  
                  {/* Phone Number */}
                  <View style={styles.profileDetailRow}>
                    <Ionicons name="call-outline" size={20} color={colors.headerText} style={styles.detailIcon} />
                    <Text style={[styles.profileDetailText, { color: colors.headerText }]}>
                      {userData.phone_number || t('No phone specified')}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={[styles.signInPrompt, { backgroundColor: colors.background }]}>
                <View style={[styles.signInPromptContent, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                  <View style={styles.signInIconContainer}>
                    <View style={[styles.signInIconBackground, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons name="person-circle-outline" size={80} color={colors.primary} />
                    </View>
                  </View>
                  <Text style={[styles.signInPromptTitle, { color: colors.text }]}>{t('welcomeToDormMarketplace')}</Text>
                  <Text style={[styles.signInPromptText, { color: colors.textSecondary }]}>
                    {t('signInToAccess')}
                  </Text>
                  <View style={styles.signInButtonContainer}>
                    <TouchableOpacity
                      style={[styles.signInPromptButton, { backgroundColor: colors.primary, shadowColor: colors.shadow }]}
                      onPress={() => navigation.navigate('Login')}
                    >
                      <Ionicons name="log-in-outline" size={20} color={colors.headerText} />
                      <Text style={[styles.signInPromptButtonText, { color: colors.headerText }]}>{t('signIn')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.signUpPromptButton, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]}
                      onPress={() => navigation.navigate('SignUp')}
                    >
                      <Ionicons name="person-add-outline" size={20} color={colors.primary} />
                      <Text style={[styles.signUpPromptButtonText, { color: colors.primary }]}>{t('createAccount')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Settings Section */}
            <View style={[styles.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Settings')}</Text>
              
              {/* Language Setting Item */}
              <TouchableOpacity
                style={[styles.settingItem, { borderBottomColor: colors.border }]}
                onPress={() => setIsLanguageModalVisible(true)}
              >
                <View style={styles.settingContent}>
                  <Ionicons name="language-outline" size={24} color={colors.primary} style={styles.settingIcon} />
                  <Text style={[styles.settingText, { color: colors.text }]}>{t('Language')}</Text>
                </View>
                <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                  {i18n.language === 'en' ? t('english') : t('russian')}
                </Text>
              </TouchableOpacity>

              {/* Theme Setting Item */}
              <TouchableOpacity
                style={[styles.settingItem, { borderBottomColor: colors.border }]}
                onPress={() => setIsThemeModalVisible(true)}
              >
                <View style={styles.settingContent}>
                  <Ionicons 
                    name={currentTheme === 'light' ? 'sunny-outline' : 'moon-outline'} 
                    size={24} 
                    color={colors.primary} 
                    style={styles.settingIcon} 
                  />
                  <Text style={[styles.settingText, { color: colors.text }]}>{t('theme')}</Text>
                </View>
                <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                  {currentTheme === 'light' ? t('lightTheme') : 
                   currentTheme === 'dark' ? t('darkTheme') : t('systemTheme')}
                </Text>
              </TouchableOpacity>

              {/* Message Notifications Setting Item */}
              <TouchableOpacity
                style={[styles.settingItem, { borderBottomColor: colors.border }]}
                onPress={() => setIsNotificationModalVisible(true)}
              >
                <View style={styles.settingContent}>
                  <Ionicons 
                    name="notifications-outline" 
                    size={24} 
                    color={colors.primary} 
                    style={styles.settingIcon} 
                  />
                  <Text style={[styles.settingText, { color: colors.text }]}>{t('Message Notifications')}</Text>
                </View>
                <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                  {messageNotificationsEnabled ? t('enabled') : t('disabled')}
                </Text>
              </TouchableOpacity>


            </View>

            {/* Account Management Section - Only show if logged in */}
            {userId && (
              <View style={[styles.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Account Management')}</Text>
                
                {/* Blocked Users */}
                <TouchableOpacity
                  style={[styles.settingItem, { borderBottomColor: colors.border }]}
                  onPress={() => setShowBlockedUsersModal(true)}
                >
                  <View style={styles.settingContent}>
                    <Ionicons 
                      name="people-outline" 
                      size={24} 
                      color={colors.primary} 
                      style={styles.settingIcon} 
                    />
                    <Text style={[styles.settingText, { color: colors.text }]}>{t('blockedUsers')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                
                {/* Delete Account */}
                <TouchableOpacity
                  style={[
                    styles.settingItem, 
                    { borderBottomColor: colors.border },
                    isDeletingAccount && { opacity: 0.5 }
                  ]}
                  onPress={handleDeleteAccount}
                  disabled={isDeletingAccount}
                >
                  <View style={styles.settingContent}>
                    {isDeletingAccount ? (
                      <ActivityIndicator size="small" color={colors.error} style={styles.settingIcon} />
                    ) : (
                      <Ionicons 
                        name="trash-outline" 
                        size={24} 
                        color={colors.error} 
                        style={styles.settingIcon} 
                      />
                    )}
                    <Text style={[styles.settingText, { color: colors.error }]}>
                      {isDeletingAccount ? t('deletingAccount') : t('Delete Account')}
                    </Text>
                  </View>
                  {!isDeletingAccount && <Ionicons name="chevron-forward" size={20} color={colors.error} />}
                </TouchableOpacity>
              </View>
            )}

            {/* My Products Section - Only show if logged in */}
            {userId && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('My Ads')}</Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                    {userProducts.length} {userProducts.length === 1 ? t('item') : t('items')}
                  </Text>
                </View>
              </>
            )}

            {userId && (
              <>
                {userProducts.length === 0 ? (
                  <View style={[styles.noProductsContainer, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    <Ionicons name="basket-outline" size={60} color={colors.textSecondary} style={styles.noProductsIcon} />
                    <Text style={[styles.noProductsText, { color: colors.textSecondary }]}>
                      {t('You haven\'t posted any ads yet')}
                    </Text>
                    <TouchableOpacity 
                      style={[styles.addFirstProductButton, { backgroundColor: colors.primary }]}
                      onPress={handleAddProduct}
                    >
                      <Text style={[styles.addFirstProductText, { color: colors.headerText }]}>{t('Add your first product')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.productsGrid}>
                    {userProducts.map((item) => (
                      <View key={item.id} style={[styles.productCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                        <Image
                          source={{
                            uri: item.main_image_url || 
                                 `https://via.placeholder.com/150/FF5722/FFFFFF?text=${item.name.charAt(0).toUpperCase()}`
                          }}
                          style={[styles.productImage, { backgroundColor: colors.surface }]}
                          onError={(e) => {
                            console.error('Image load error:', e.nativeEvent.error);
                            console.error('Failed URL:', item.main_image_url);
                          }}
                        />
                        <View style={[styles.productDetails, { backgroundColor: colors.card }]}>
                          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                          {item.type === 'sell' && (
                            <Text style={[styles.productPrice, { color: colors.primary }]}>₽{Math.round(item.price)}</Text>
                          )}
                          <Text style={[styles.productDorm, { color: colors.textSecondary }]}>{item.dorm || t('No location specified')}</Text>
                          
                          <View style={[styles.productActions, { borderTopColor: colors.border }]}>
                            <TouchableOpacity
                              style={[styles.editButton, { backgroundColor: colors.primary }]}
                              onPress={() => {
                                navigation.navigate('EditAd', {
                                  product: item,
                                  onGoBack: () => navigation.setParams({ refresh: Date.now() })
                                });
                              }}
                              disabled={isProductLoading(item.id)}
                            >
                              <Ionicons name="create-outline" size={22} color={colors.headerText} />
                              <Text style={[styles.actionButtonText, { color: colors.headerText }]}>{t('edit')}</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                              style={[styles.deleteButton, { backgroundColor: colors.error }]}
                              onPress={() => item.type === 'buy' ? 
                                handleDeleteBuyOrder(item.id) : 
                                handleDeleteProduct(item.id)}
                              disabled={isProductLoading(item.id)}
                            >
                              <Ionicons name="trash-outline" size={22} color={colors.headerText} />
                              <Text style={[styles.actionButtonText, { color: colors.headerText }]}>{t('delete')}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        {item.type === 'buy' && (
                          <View style={[styles.buyOrderBadge, { backgroundColor: colors.secondary }]}>
                            <Text style={[styles.buyOrderBadgeText, { color: colors.headerText }]}>{t('lookingFor')}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
            
            {/* Language Selection Modal */}
            <Modal
              visible={isLanguageModalVisible}
              animationType="fade"
              transparent={true}
              onRequestClose={() => setIsLanguageModalVisible(false)}
            >
              <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[styles.modalContent, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{t('selectLanguage')}</Text>
                  
                  <TouchableOpacity 
                    style={[
                      styles.languageOption,
                      { borderBottomColor: colors.border },
                      i18n.language === 'en' && { backgroundColor: colors.primary + '20' }
                    ]}
                    onPress={() => handleLanguageChange('en')}
                  >
                    <Text style={[
                      styles.languageOptionText,
                      { color: colors.text },
                      i18n.language === 'en' && { color: colors.primary, fontWeight: 'bold' }
                    ]}>
                      {t('english')}
                    </Text>
                    {i18n.language === 'en' && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.languageOption,
                      { borderBottomColor: colors.border },
                      i18n.language === 'ru' && { backgroundColor: colors.primary + '20' }
                    ]}
                    onPress={() => handleLanguageChange('ru')}
                  >
                    <Text style={[
                      styles.languageOptionText,
                      { color: colors.text },
                      i18n.language === 'ru' && { color: colors.primary, fontWeight: 'bold' }
                    ]}>
                      {t('russian')}
                    </Text>
                    {i18n.language === 'ru' && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => setIsLanguageModalVisible(false)}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{t('cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Theme Selection Modal */}
            <Modal
              visible={isThemeModalVisible}
              animationType="fade"
              transparent={true}
              onRequestClose={() => setIsThemeModalVisible(false)}
            >
              <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[styles.modalContent, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{t('themeSetting')}</Text>
                  
                  <TouchableOpacity 
                    style={[
                      styles.languageOption,
                      { borderBottomColor: colors.border },
                      currentTheme === THEME_TYPES.LIGHT && { backgroundColor: colors.primary + '20' }
                    ]}
                    onPress={() => handleThemeChange(THEME_TYPES.LIGHT)}
                  >
                    <View style={styles.themeOptionContent}>
                      <Ionicons name="sunny-outline" size={24} color={colors.primary} />
                      <Text style={[
                        styles.languageOptionText,
                        { color: colors.text },
                        currentTheme === THEME_TYPES.LIGHT && { color: colors.primary, fontWeight: 'bold' }
                      ]}>
                        {t('lightTheme')}
                      </Text>
                    </View>
                    {currentTheme === THEME_TYPES.LIGHT && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.languageOption,
                      { borderBottomColor: colors.border },
                      currentTheme === THEME_TYPES.DARK && { backgroundColor: colors.primary + '20' }
                    ]}
                    onPress={() => handleThemeChange(THEME_TYPES.DARK)}
                  >
                    <View style={styles.themeOptionContent}>
                      <Ionicons name="moon-outline" size={24} color={colors.primary} />
                      <Text style={[
                        styles.languageOptionText,
                        { color: colors.text },
                        currentTheme === THEME_TYPES.DARK && { color: colors.primary, fontWeight: 'bold' }
                      ]}>
                        {t('darkTheme')}
                      </Text>
                    </View>
                    {currentTheme === THEME_TYPES.DARK && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.languageOption,
                      { borderBottomColor: colors.border },
                      currentTheme === THEME_TYPES.SYSTEM && { backgroundColor: colors.primary + '20' }
                    ]}
                    onPress={() => handleThemeChange(THEME_TYPES.SYSTEM)}
                  >
                    <View style={styles.themeOptionContent}>
                      <Ionicons name="settings-outline" size={24} color={colors.primary} />
                      <Text style={[
                        styles.languageOptionText,
                        { color: colors.text },
                        currentTheme === THEME_TYPES.SYSTEM && { color: colors.primary, fontWeight: 'bold' }
                      ]}>
                        {t('systemTheme')}
                      </Text>
                    </View>
                    {currentTheme === THEME_TYPES.SYSTEM && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => setIsThemeModalVisible(false)}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{t('cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Notification Settings Modal */}
            <Modal
              visible={isNotificationModalVisible}
              animationType="fade"
              transparent={true}
              onRequestClose={() => setIsNotificationModalVisible(false)}
            >
              <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[styles.modalContent, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{t('Message Notifications')}</Text>
                  
                  <TouchableOpacity 
                    style={[
                      styles.languageOption,
                      { borderBottomColor: colors.border },
                      messageNotificationsEnabled && { backgroundColor: colors.primary + '20' }
                    ]}
                    onPress={() => handleNotificationChange(true)}
                  >
                    <View style={styles.themeOptionContent}>
                      <Ionicons name="notifications" size={24} color={colors.primary} />
                      <Text style={[
                        styles.languageOptionText,
                        { color: colors.text },
                        messageNotificationsEnabled && { color: colors.primary, fontWeight: 'bold' }
                      ]}>
                        {t('enabled')}
                      </Text>
                    </View>
                    {messageNotificationsEnabled && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.languageOption,
                      { borderBottomColor: colors.border },
                      !messageNotificationsEnabled && { backgroundColor: colors.primary + '20' }
                    ]}
                    onPress={() => handleNotificationChange(false)}
                  >
                    <View style={styles.themeOptionContent}>
                      <Ionicons name="notifications-off" size={24} color={colors.primary} />
                      <Text style={[
                        styles.languageOptionText,
                        { color: colors.text },
                        !messageNotificationsEnabled && { color: colors.primary, fontWeight: 'bold' }
                      ]}>
                        {t('disabled')}
                      </Text>
                    </View>
                    {!messageNotificationsEnabled && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.testButton, { backgroundColor: colors.primary }]}
                    onPress={testNotification}
                  >
                    <Text style={[styles.testButtonText, { color: colors.headerText }]}>Test Notification</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.testButton, { backgroundColor: colors.secondary }]}
                    onPress={testTokenSaving}
                  >
                    <Text style={[styles.testButtonText, { color: colors.headerText }]}>Save Token to DB</Text>
                  </TouchableOpacity>
                  
                                       <TouchableOpacity
                       style={[styles.testButton, { backgroundColor: colors.error }]}
                       onPress={async () => {
                         try {
                           await notificationService.saveCurrentToken();
                           Alert.alert('Success', 'Token saved to database!');
                         } catch (error) {
                           Alert.alert('Error', 'Failed to save token');
                         }
                       }}
                     >
                       <Text style={[styles.testButtonText, { color: colors.headerText }]}>Force Save Token</Text>
                     </TouchableOpacity>
                                            <TouchableOpacity
                         style={[styles.testButton, { backgroundColor: colors.secondary }]}
                         onPress={async () => {
                           try {
                             await notificationService.activateAllTokens();
                             Alert.alert('Success', 'All tokens activated!');
                           } catch (error) {
                             Alert.alert('Error', 'Failed to activate tokens');
                           }
                         }}
                       >
                         <Text style={[styles.testButtonText, { color: colors.headerText }]}>Activate All Tokens</Text>
                       </TouchableOpacity>
                       <TouchableOpacity
                         style={[styles.testButton, { backgroundColor: colors.primary }]}
                         onPress={async () => {
                           try {
                             // Test message notification
                             const { data, error } = await supabase.functions.invoke('send-push-notification', {
                               body: {
                                 targetUserId: 'd20c009c-a14d-4cf2-a64d-af377dc608b6', // Replace with actual user ID
                                 title: 'Test Message Notification',
                                 body: 'This is a test message notification',
                                 data: {
                                   type: 'message',
                                   conversationId: 'test-conversation',
                                   otherUserId: 'test-sender',
                                   messageContent: 'Test message'
                                 }
                               }
                             });
                             
                             if (error) {
                               Alert.alert('Error', `Failed to send test notification: ${error.message}`);
                             } else {
                               Alert.alert('Success', `Test notification sent: ${JSON.stringify(data)}`);
                             }
                           } catch (error) {
                             Alert.alert('Error', `Failed to send test notification: ${error.message}`);
                           }
                         }}
                       >
                         <Text style={[styles.testButtonText, { color: colors.headerText }]}>Test Message Notification</Text>
                       </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => setIsNotificationModalVisible(false)}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{t('cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Blocked Users Modal */}
            <Modal
              visible={showBlockedUsersModal}
              animationType="slide"
              presentationStyle="pageSheet"
              onRequestClose={() => setShowBlockedUsersModal(false)}
            >
              <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ flex: 1 }}>
                  <BlockedUsersScreen />
                </View>
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    top: Platform.OS === 'ios' ? 10 : 20,
                    right: 20,
                    zIndex: 1000,
                    padding: 10,
                  }}
                  onPress={() => setShowBlockedUsersModal(false)}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </SafeAreaView>
            </Modal>
          </ScrollView>
        </SafeAreaView>
      )}
    </ErrorBoundaryWrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    paddingTop: Platform.OS === 'ios' ? 30 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-end', // Align items to bottom
  },
  profileImageContainer: {
    marginRight: 20,
    marginBottom: 10, // Add some bottom margin
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  profileInfoContainer: {
    flex: 1,
    position: 'relative',
    paddingBottom: 10, // Add some bottom padding
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    marginBottom: 12,
  },
  profileDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  profileDetailText: {
    flex: 1,
    fontSize: 14,
    
  },
  detailIcon: {
    marginRight: 8,
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    
  },
  sectionSubtitle: {
    fontSize: 14,
  },
  noProductsContainer: {
    alignItems: 'center',
    padding: 30,
    margin: 20,
    borderRadius: 15,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  noProductsIcon: {
    marginBottom: 15,
  },
  noProductsText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  addFirstProductButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  addFirstProductText: {
    fontWeight: 'bold',
  },
  productsGrid: {
    paddingHorizontal: 15,
    paddingTop: 5, // Add some top padding
    alignItems: 'center', // Center cards horizontally
  },
  productCard: {
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    shadowOffset: { 
      width: 0, 
      height: 4 // Increased shadow offset
    },
    shadowOpacity: 0.25, // Increased opacity
    shadowRadius: 12, // Increased radius
    elevation: 8, // Increased elevation for Android
    width: '92%',
    alignSelf: 'center',
    borderWidth: Platform.OS === 'android' ? 1 : 0,
  },
  productImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  productDetails: {
    padding: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 22,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  dormContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productDorm: {
    fontSize: 14,
    marginLeft: 4,
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  hiddenBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  hiddenBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    width: '100%',
    borderBottomWidth: 1,
  },
  languageOptionSelected: {
  },
  languageOptionText: {
    fontSize: 16,
  },
  languageOptionTextSelected: {
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 15,
    padding: 15,
    width: '100%',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  testButton: {
    marginTop: 15,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingValue: {
    fontSize: 16,
  },
  profileImageFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  profileImageFallbackText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
  },
  settingIcon: {
    marginRight: 10,
  },
  themeOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  editPictureButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    margin: 5,
  },
  headerButtons: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 15 : 10, // Reduced from 60/30 to 15/10
    right: 5,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12, // Slightly reduced gap between buttons
    zIndex: 10,
  },
  
  headerButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  headerButtonContainer: {
    padding: 8, // Slightly reduced from 10
    borderRadius: 18, // Slightly reduced from 20
  },
  buyOrderBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  buyOrderBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  signInPrompt: {
    paddingTop: Platform.OS === 'ios' ? 10 : 5,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 500,
  },
  signInPromptContent: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 30,
    width: '100%',
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  signInIconContainer: {
    marginBottom: 0,
    alignItems: 'center',
  },
  signInIconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  signInPromptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  signInPromptText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  signInButtonContainer: {
    flexDirection: 'column',
    width: '100%',
    marginTop: 30,
    gap: 15,
  },
  signInPromptButton: {
    paddingHorizontal: 25,
    paddingVertical: 16,
    borderRadius: 25,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  signInPromptButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  signUpPromptButton: {
    paddingHorizontal: 25,
    paddingVertical: 16,
    borderRadius: 25,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  signUpPromptButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AccountScreen;
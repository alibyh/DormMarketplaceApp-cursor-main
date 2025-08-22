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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import supabase from '../../services/supabaseConfig';
import ErrorBoundaryWrapper from '../../components/ErrorBoundary/ErrorBoundaryWrapper';
import LoadingState from '../../components/LoadingState/LoadingState';
import RetryView from '../../components/RetryView/RetryView';

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
  const [loadingProductIds, setLoadingProductIds] = useState([]);
  const [error, setError] = useState(null);

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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
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
        // User is not logged in, show sign-in prompt
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
        
        // Check Supabase storage URL for debugging
        try {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl('test.jpg');
        } catch (storageError) {
        }
        
        // First check if we can get data from user metadata
        if (user.user_metadata) {
          const metadata = user.user_metadata;
          
          // Check for avatar_url in metadata
          if (metadata.avatar_url) {
          }
          
          // Set some initial data from metadata
          const initialData = {
            username: metadata.username || metadata.name || '',
            email: user.email || '',
            dorm: metadata.dorm || '',
            phone_number: metadata.phone_number || '',
            profilePicture: metadata.avatar_url || null,
            allow_phone_contact: metadata.allow_phone_contact || false
          };
          
          // Set this initial data
          setUserData(initialData);
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
          handleProfileData(profileData, user.email, user.user_metadata);
        } else {
          console.log('No profile data found for user:', user.id);
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
    
    // COMPLETELY REVISED PROFILE PICTURE HANDLING
    let profilePicValue = null;
    
    // Always try to get Supabase URLs for avatar files
    const getSupabaseAvatarUrl = (filename) => {
      if (!filename) return null;
      
      // If it's already a complete URL, use it
      if (filename.startsWith('http')) {
        return filename;
      }
      
      // If it's already a Supabase URL (contains the storage path), extract just the filename
      if (filename.includes('avatars/')) {
        const parts = filename.split('avatars/');
        if (parts.length > 1) {
          filename = parts[1];
        }
      }
      
      // Otherwise, get the public URL from Supabase
      try {
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(filename);
        
        if (data && data.publicUrl) {
          return data.publicUrl;
        }
      } catch (e) {
        console.log('Error generating Supabase URL:', e);
      }
      return null;
    };
    
    // Only try to get a Supabase URL if the avatar_url field actually has a value
    if (profileData.avatar_url) {
      // Check if it's already a complete URL
      if (profileData.avatar_url.startsWith('http')) {
        profilePicValue = profileData.avatar_url;
      } else {
      profilePicValue = getSupabaseAvatarUrl(profileData.avatar_url);
      }
    }
    
    // If no URL from profile, try metadata
    if (!profilePicValue && userMetadata && userMetadata.avatar_url) {
      // Check if it's already a complete URL
      if (userMetadata.avatar_url.startsWith('http')) {
        profilePicValue = userMetadata.avatar_url;
      } else {
      profilePicValue = getSupabaseAvatarUrl(userMetadata.avatar_url);
      }
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
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
    
    // Subscribe to auth changes but don't navigate
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        console.log('Auth state changed to signed out');
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
              console.log('Logging out user...');
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
              
              console.log('Logout completed successfully');
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

                // 3. Delete the product record
                const { error: deleteError } = await supabase
                  .from('products')
                  .delete()
                  .eq('id', productId);

                if (deleteError) throw deleteError;

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

                // 3. Delete the buy order record
                const { error: deleteError } = await supabase
                  .from('buy_orders')
                  .delete()
                  .eq('id', orderId);

                if (deleteError) throw deleteError;

                // 4. Update local state
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



  return (
    <ErrorBoundaryWrapper
      onRetry={handleRefresh}
      loadingMessage={t('loadingProfile')}
      errorMessage={error?.message || t('errorLoadingProfile')}
    >
      {isLoading ? (
        <LoadingState message={t('loadingProfile')} />
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
                progressViewOffset={50}
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
              <View style={[styles.signInPrompt, { backgroundColor: colors.surface }]}>
                <View style={[styles.signInPromptContent, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
                  <View style={styles.signInIconContainer}>
                    <Ionicons name="person-circle-outline" size={100} color={colors.primary} />
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
                      style={[styles.signUpPromptButton, { backgroundColor: colors.secondary, shadowColor: colors.shadow }]}
                      onPress={() => navigation.navigate('SignUp')}
                    >
                      <Ionicons name="person-add-outline" size={20} color={colors.headerText} />
                      <Text style={[styles.signUpPromptButtonText, { color: colors.headerText }]}>{t('createAccount')}</Text>
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
            </View>

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
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  signInPromptContent: {
    alignItems: 'center',
    paddingVertical: 40,
    width: '100%',
  },
  signInIconContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  signInPromptTitle: {
    fontSize: 28,
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 30,
    gap: 15,
  },
  signInPromptButton: {
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  signInPromptButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  signUpPromptButton: {
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  signUpPromptButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AccountScreen;
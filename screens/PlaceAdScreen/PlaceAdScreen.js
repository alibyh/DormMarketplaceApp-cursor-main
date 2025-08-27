import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  Linking
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import supabase from '../../services/supabaseConfig';
import ErrorBoundaryWrapper from '../../components/ErrorBoundary/ErrorBoundaryWrapper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { processImageForUpload, uploadImageToSupabase, getPublicUrl } from '../../utils/imageUtils';
import { checkAuthenticationWithFallback } from '../../utils/authUtils';

const { width } = Dimensions.get('window');

const testBucketAccess = async () => {
  try {

    
    // Note: listBuckets() often returns empty array even when buckets exist
    // So we'll test individual bucket access instead
    
    // Test product_images bucket
    const { data: productFiles, error: productError } = await supabase.storage
      .from('product_images')
      .list();

    if (productError) {
      console.error('Error accessing product_images bucket:', productError);
    } else {

    }

    // Test buy-orders-images bucket
    const { data: buyOrderFiles, error: buyOrderError } = await supabase.storage
      .from('buy-orders-images')
      .list();

    if (buyOrderError) {
      console.error('Error accessing buy-orders-images bucket:', buyOrderError);
    } else {

    }

    // Test public URL generation
    if (productFiles?.length > 0) {
      const { data: urlData, error: urlError } = await supabase.storage
        .from('product_images')
        .getPublicUrl(productFiles[0].name);
      
      if (urlError) {
        console.error('Error generating public URL:', urlError);
      } else {

      }
    }



  } catch (error) {
    console.error('Bucket access test failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
  }
};

const PlaceAdScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { getThemeColors } = useTheme();
  const colors = getThemeColors();
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    dorm: '',
    price: '',
    currency: '₽'
  });
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [adType, setAdType] = useState('sell');
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isNetworkError, setIsNetworkError] = useState(false);

  const updateProductData = (key, value) => {
    setProductData(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetForm = () => {
    setProductData({
      name: '',
      description: '',
      dorm: '',
      price: '',
      currency: '₽'
    });
    setImages([]);
  };

  const initialValues = {
    name: '',
    price: '',
    description: '',
    dorm: '',
    adType: 'sell'
  };

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const { user, isNetworkError, error } = await checkAuthenticationWithFallback();
      
      if (isNetworkError) {
        // Network error - show network error UI instead of treating as logged out
        console.log('Network error during auth check:', error);
        setIsNetworkError(true);
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        return;
      }
      
      if (error) {
        console.log('Auth error (expected for unauthenticated users):', error);
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        return;
      }
      
      if (!user) {
        // User is not authenticated, show sign-in prompt
        Alert.alert(
          t('authenticationRequired'),
          t('pleaseSignInToPlaceAd'),
          [
            {
              text: t('Cancel'),
              style: 'cancel',
              onPress: () => navigation.goBack()
            },
            {
              text: t('signIn'),
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
        setIsAuthenticated(false);
        return;
      }
      
      setIsAuthenticated(true);
      fetchUserDorm();
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      Alert.alert(
        t('error'),
        t('unableToVerifyAuthentication'),
        [
          {
            text: t('OK'),
            onPress: () => navigation.goBack()
          }
        ]
      );
    } finally {
      setIsCheckingAuth(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserDorm();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (adType === 'buy') {
      // Clear price when switching to buy mode
      formikRef.current?.setFieldValue('price', '');
    }
  }, [adType]);

  useEffect(() => {
    // Only test bucket access if user is authenticated
    if (isAuthenticated) {
      testBucketAccess();
    }
  }, [isAuthenticated]);

  const fetchUserDorm = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('User not authenticated for dorm fetch');
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('dorm')
        .eq('id', user.id)
        .single();

      if (data && data.dorm) {
        // Update Formik form value
        formikRef.current?.setFieldValue('dorm', data.dorm);
      }
    } catch (error) {
      console.error('Error fetching user dorm:', error);
    }
  };

  const formikRef = React.useRef();

  const validationSchema = Yup.object().shape({
    name: Yup.string()
      .required(t('nameRequired'))
      .min(3, t('nameMinLength')),
    price: Yup.string()
      .test('price-validation', t('priceRequired'), function(value) {
        // Skip validation if it's a buy order
        if (this.parent.adType === 'buy') return true;
        return !!value;
      }),
    description: Yup.string()
      .required(t('descriptionRequired'))
      .min(10, t('descriptionMinLength')),
    dorm: Yup.string()
      .required(t('dormRequired')),
    adType: Yup.string()
      .oneOf(['sell', 'buy'])
  });

  const pickImageFromLibrary = async () => {
    try {
      if (images.length >= 5) {
        Alert.alert(t('error'), t('maximumImagesAllowed'));
        return;
      }

      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('permissionRequired'),
          t('photoLibraryPermissionRequired'),
          [
            { text: t('Cancel'), style: 'cancel' },
            { text: t('Settings'), onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 5 - images.length,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {

        
        const newImages = result.assets.map((asset, index) => ({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: `photo_${Date.now()}_${index}.jpg`,
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize
        }));
        
        setImages(prev => [...prev, ...newImages].slice(0, 5));
      } else if (result.canceled) {
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(
        t('error'), 
        t('couldNotSelectImage'),
        [{ text: t('OK') }]
      );
    }
  };

  const removeImage = (index) => {
    setImages(prevImages => prevImages.filter((_, i) => i !== index));
  };

  const handleAdTypeChange = (type) => {
    setAdType(type);
    formikRef.current?.setFieldValue('adType', type);
    if (type === 'buy') {
      formikRef.current?.setFieldValue('price', '');
    }
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {

      if (images.length === 0) {
        Alert.alert(t('error'), t('pleaseAddOneImage'));
        return;
      }

      setSubmitting(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if profile exists, create if it doesn't

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!profile) {

        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            username: user.email?.split('@')[0] || 'user',
            updated_at: new Date().toISOString()
          }]);

        if (createProfileError) {
          console.error('Profile creation error:', createProfileError);
          throw createProfileError;
        }
      }

      // Create base record with better error handling and RLS workaround
      let newItem;
      let insertError;

      try {
        const insertData = {
          name: values.name,
          description: values.description,
          dorm: values.dorm,
          ...(values.adType === 'sell' ? {
            price: parseFloat(values.price),
            seller_id: user.id
          } : {
            user_id: user.id
          }),
          created_at: new Date().toISOString(),
          is_available: true,
          main_image_url: null,
          images: []
        };

        // First attempt: Try normal insert
        let { data, error } = await supabase
          .from(values.adType === 'sell' ? 'products' : 'buy_orders')
          .insert([insertData])
          .select()
          .single();

                 // If RLS policy error, try alternative approaches
         if (error && error.code === '42501' && error.message.includes('row-level security policy')) {
           console.warn('RLS policy error detected, trying alternative approaches...');
           
           // Try 1: RPC call as fallback
           try {
             const { data: rpcData, error: rpcError } = await supabase.rpc(
               values.adType === 'sell' ? 'create_product_with_auth' : 'create_buy_order_with_auth',
               values.adType === 'sell' ? {
                 p_name: values.name,
                 p_description: values.description,
                 p_dorm: values.dorm,
                 p_price: parseFloat(values.price),
                 p_seller_id: user.id
               } : {
                 p_name: values.name,
                 p_description: values.description,
                 p_dorm: values.dorm,
                 p_user_id: user.id
               }
             );

             if (!rpcError && rpcData) {
               data = rpcData;
               error = null;
             } else {
               console.error('RPC fallback failed:', rpcError);
               throw rpcError || new Error('RPC function not available');
             }
           } catch (rpcError) {
             console.error('RPC approach failed:', rpcError);
             
             // Try 2: Direct SQL insert as last resort
             try {
               console.warn('Attempting direct SQL insert as last resort...');
               
               // Use a simpler approach - just try the insert again with different error handling
               const { data: retryData, error: retryError } = await supabase
                 .from(values.adType === 'sell' ? 'products' : 'buy_orders')
                 .insert([insertData])
                 .select()
                 .single();

               if (retryError) {
                 console.error('All insert attempts failed:', retryError);
                 throw new Error('Unable to create record. Please check your database permissions or contact support.');
               } else {
                 data = retryData;
                 error = null;
               }
             } catch (retryError) {
               console.error('All fallback attempts failed:', retryError);
               throw new Error('Database access denied. Please try again later or contact support.');
             }
           }
         }

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }

        newItem = data;

      } catch (error) {
        console.error('Failed to create record:', error);
        
        // Provide more specific error messages
        let errorMessage = 'Failed to create listing';
        if (error.message.includes('Database security policy') || error.message.includes('row-level security policy')) {
          errorMessage = 'Database access denied. Please try again or contact support.';
        } else if (error.message.includes('duplicate key')) {
          errorMessage = 'A similar listing already exists.';
        } else if (error.message.includes('foreign key')) {
          errorMessage = 'Invalid user or dorm information.';
        } else if (error.message.includes('not null')) {
          errorMessage = 'Please fill in all required fields.';
        } else if (error.message.includes('Unable to create record')) {
          errorMessage = 'Database configuration issue. Please contact support.';
        }
        
        Alert.alert(t('error'), errorMessage);
        throw error;
      }

      // Upload images to storage
      const uploadedImages = [];
      for (let i = 0; i < images.length; i++) {
        try {
          const image = images[i];
          const fileName = `${newItem.id}/${Date.now()}_${i}.jpg`;
          let bucket = values.adType === 'sell' ? 'product_images' : 'buy-orders-images';

          // Check if the bucket is accessible by trying to list files
          // Note: listBuckets() often returns empty array even when buckets exist
          let bucketAccessible = false;
          try {
            const { data: bucketFiles, error: bucketListError } = await supabase.storage
              .from(bucket)
              .list('', { limit: 1 }); // Just check if we can access the bucket
            
            if (bucketListError) {
              console.warn(`Bucket ${bucket} not accessible: ${bucketListError.message}`);
              // Try fallback bucket
              bucket = 'product_images';
              const { data: fallbackFiles, error: fallbackError } = await supabase.storage
                .from(bucket)
                .list('', { limit: 1 });
              
              if (fallbackError) {
                console.error(`Fallback bucket ${bucket} also not accessible: ${fallbackError.message}`);
                throw new Error(`No suitable storage bucket found`);
              } else {
                bucketAccessible = true;
              }
            } else {
              bucketAccessible = true;
            }
          } catch (accessError) {
            console.error(`Error checking bucket access: ${accessError.message}`);
            throw new Error(`Storage access error: ${accessError.message}`);
          }

          // Convert image to binary data with better error handling
          let imageData;
          try {
            const fetchResponse = await fetch(image.uri);
            if (!fetchResponse.ok) {
              throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
            }

            const arrayBuffer = await fetchResponse.arrayBuffer();
            imageData = new Uint8Array(arrayBuffer);
            
            if (imageData.length === 0) {
              throw new Error('Image data is empty');
            }
            
          } catch (fetchError) {
            console.error(`Error fetching image ${i + 1}:`, fetchError);
            throw new Error(`Failed to process image: ${fetchError.message}`);
          }

          // Upload with retry logic
          let uploadSuccess = false;
          let uploadError = null;
          
          for (let retry = 0; retry < 3; retry++) {
            try {
              const { data: uploadData, error: uploadErr } = await supabase.storage
                .from(bucket)
                .upload(fileName, imageData, {
                  contentType: 'image/jpeg',
                  upsert: true,
                  cacheControl: '3600'
                });

              if (uploadErr) {
                uploadError = uploadErr;
                console.warn(`Upload attempt ${retry + 1} failed for image ${i + 1}:`, uploadErr);
                if (retry < 2) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
                  continue;
                }
              } else {
                uploadSuccess = true;
                break;
              }
            } catch (retryError) {
              uploadError = retryError;
              console.warn(`Upload attempt ${retry + 1} threw error for image ${i + 1}:`, retryError);
              if (retry < 2) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
                continue;
              }
            }
          }

          if (!uploadSuccess) {
            throw uploadError || new Error('Upload failed after 3 attempts');
          }

          // Verify the upload by getting the public URL
          const { data: urlData, error: urlError } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);

          if (urlError) {
            console.warn(`Warning: Could not get public URL for ${fileName}:`, urlError);
          } else {
          }

          uploadedImages.push(fileName);

        } catch (error) {
          console.error(`Error uploading image ${i + 1}:`, error);
          
          // More user-friendly error message
          let errorMessage = 'Unknown upload error';
          if (error.message.includes('Storage access error')) {
            errorMessage = 'Storage access denied. Please check your connection and try again.';
          } else if (error.message.includes('not found')) {
            errorMessage = 'Storage configuration error. Please contact support.';
          } else if (error.message.includes('Failed to process image')) {
            errorMessage = 'Image processing failed. Please try selecting a different image.';
          } else if (error.message.includes('Upload failed after 3 attempts')) {
            errorMessage = 'Upload failed due to network issues. Please check your connection and try again.';
          } else {
            errorMessage = `Upload failed: ${error.message}`;
          }
          
          Alert.alert(
            'Upload Error',
            `Failed to upload image ${i + 1}: ${errorMessage}`,
            [
              {
                text: 'Continue without this image',
                onPress: () => {

                }
              },
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  throw new Error('User cancelled upload');
                }
              }
            ]
          );
          
          // Continue with other images instead of throwing
          continue;
        }
      }

      // 3. Update record with image paths
      if (uploadedImages.length === 0) {
        console.error('No images were uploaded successfully');
        Alert.alert(
          t('error'),
          t('noImagesUploaded'),
          [
            {
              text: t('OK'),
              onPress: () => {
                // Clean up the created record since no images were uploaded
                supabase
                  .from(values.adType === 'sell' ? 'products' : 'buy_orders')
                  .delete()
                  .eq('id', newItem.id)
                  .then(() => {

                  })
                  .catch(cleanupError => {
                    console.error('Error cleaning up record:', cleanupError);
                  });
              }
            }
          ]
        );
        return;
      }

      const { error: updateError } = await supabase
        .from(values.adType === 'sell' ? 'products' : 'buy_orders')
        .update({
          main_image_url: uploadedImages[0],
          images: uploadedImages,
          updated_at: new Date().toISOString()
        })
        .eq('id', newItem.id);

      if (updateError) throw updateError;

      Alert.alert(
        t('success'),
        t(values.adType === 'sell' ? 'productPosted' : 'buyOrderPosted'),
                  [{ text: t('ok'), onPress: () => navigation.navigate('Home') }]
      );

      setImages([]);
      resetForm();

    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert(
        t('error'),
                  error.message === 'Not authenticated' 
            ? t('pleaseLoginToPost')
            : t('failedToCreateListing')
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('checkingAuthentication')}</Text>
      </View>
    );
  }

  // Show network error UI if network error
  if (isNetworkError) {
    return (
      <View style={[styles.signInPrompt, { backgroundColor: colors.background }]}>
        <View style={[styles.signInPromptContent, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <Ionicons name="wifi-outline" size={80} color={colors.error} />
          <Text style={[styles.signInPromptTitle, { color: colors.text }]}>{t('noInternet')}</Text>
          <Text style={[styles.signInPromptText, { color: colors.textSecondary }]}>
            {t('checkConnection')}
          </Text>
          <TouchableOpacity
            style={[styles.signInPromptButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              setIsNetworkError(false);
              setIsCheckingAuth(true);
              checkAuthentication();
            }}
          >
            <Text style={[styles.signInPromptButtonText, { color: colors.headerText }]}>{t('retry')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>{t('goBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <View style={[styles.signInPrompt, { backgroundColor: colors.background }]}>
        <View style={[styles.signInPromptContent, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <Ionicons name="person-circle-outline" size={80} color={colors.primary} />
          <Text style={[styles.signInPromptTitle, { color: colors.text }]}>{t('authenticationRequired')}</Text>
          <Text style={[styles.signInPromptText, { color: colors.textSecondary }]}>
            {t('pleaseSignInToPlaceAd')}
          </Text>
          <TouchableOpacity
            style={[styles.signInPromptButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={[styles.signInPromptButtonText, { color: colors.headerText }]}>{t('signIn')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>{t('goBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <Formik
      innerRef={formikRef}
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({ handleSubmit, values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
        <ErrorBoundaryWrapper
          onRetry={() => setError(null)}
          loadingMessage={t('submitting')}
          errorMessage={error}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
                              <View style={[styles.header, { backgroundColor: colors.headerBackground }]}>
                  <Text style={[styles.title, { color: colors.headerText }]}>{t('Place New Ad')}</Text>
                <View style={styles.adTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.adTypeButton,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      adType === 'sell' && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => handleAdTypeChange('sell')}
                  >
                    <Ionicons
                      name="pricetag-outline"
                      size={20}
                      color={adType === 'sell' ? colors.headerText : colors.secondary}
                    />
                    <Text style={[
                      styles.adTypeText,
                      { color: adType === 'sell' ? colors.headerText : colors.text },
                      adType === 'sell' && styles.adTypeTextActive
                    ]}>
                      {t('Sell Item')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.adTypeButton,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      adType === 'buy' && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => handleAdTypeChange('buy')}
                  >
                    <Ionicons
                      name="search-outline"
                      size={20}
                      color={adType === 'buy' ? colors.headerText : colors.secondary}
                    />
                    <Text style={[
                      styles.adTypeText,
                      { color: adType === 'buy' ? colors.headerText : colors.text },
                      adType === 'buy' && styles.adTypeTextActive
                    ]}>
                      {t('lookingForProduct')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.formContainer, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('Product Name')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                    placeholder={adType === 'sell' ? t('What are you selling?') : t('What are you looking for?')}
                    placeholderTextColor={colors.placeholder}
                    value={values.name}
                    onChangeText={handleChange('name')}
                    onBlur={handleBlur('name')}
                  />
                  {touched.name && errors.name && (
                    <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('Description')}</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                    placeholder={adType === 'sell' ? t('Describe your item') : t('Describe what you want to buy')}
                    placeholderTextColor={colors.placeholder}
                    value={values.description}
                    onChangeText={handleChange('description')}
                    onBlur={handleBlur('description')}
                    multiline
                    numberOfLines={4}
                  />
                  {touched.description && errors.description && (
                    <Text style={[styles.errorText, { color: colors.error }]}>{errors.description}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('Dorm/Location')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                    placeholder={t('Enter your dorm')}
                    placeholderTextColor={colors.placeholder}
                    value={values.dorm}
                    onChangeText={handleChange('dorm')}
                    onBlur={handleBlur('dorm')}
                  />
                  {touched.dorm && errors.dorm && (
                    <Text style={[styles.errorText, { color: colors.error }]}>{errors.dorm}</Text>
                  )}
                </View>

                {adType === 'sell' && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('Price (Rubles)')}</Text>
                    <View style={[styles.priceInput, { borderColor: colors.inputBorder }]}>
                      <Text style={[styles.currencySymbol, { color: colors.text }]}>₽</Text>
                      <TextInput
                        style={[styles.priceTextInput, { color: colors.text }]}
                        placeholder="0"
                        placeholderTextColor={colors.placeholder}
                        value={values.price}
                        onChangeText={handleChange('price')}
                        onBlur={handleBlur('price')}
                        keyboardType="numeric"
                      />
                    </View>
                    {touched.price && errors.price && (
                      <Text style={[styles.errorText, { color: colors.error }]}>{t(errors.price)}</Text>
                    )}
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('Images (up to 5)')}</Text>
                  <TouchableOpacity
                    style={[styles.imagePickerButton, { backgroundColor: colors.primary, shadowColor: colors.shadow }]}
                    onPress={pickImageFromLibrary}
                  >
                    <View style={[styles.imagePickerButtonInner, { backgroundColor: colors.primary }]} />
                    <AntDesign name="camera" size={24} color={colors.headerText} style={{ marginRight: 8 }} />
                    <Text style={[styles.imagePickerText, { color: colors.headerText }]}>
                      {images.length === 0 
                        ? t('addFirstPhoto')
                        : t('photosRemaining', { count: 5 - images.length })}
                    </Text>
                  </TouchableOpacity>
                </View>

                {images.length > 0 && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.subLabel, { color: colors.textSecondary }]}>{t('SelectedImages')}</Text>
                    <View style={styles.imagePreviewContainer}>
                      {images.map((image, index) => (
                        <View key={index} style={styles.imagePreview}>
                          <Image 
                            source={{ uri: image.uri }} 
                            style={styles.previewImage}
                            defaultSource={require('../../assets/placeholder.png')}
                          />
                          <View style={[styles.imageOverlay, { backgroundColor: colors.overlay }]} />
                          <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => removeImage(index)}
                          >
                            <Ionicons name="close-circle" size={22} color={colors.headerText} />
                          </TouchableOpacity>
                          {index === 0 && (
                            <View style={[styles.mainImageBadge, { backgroundColor: colors.primary }]}>
                              <Text style={[styles.mainImageText, { color: colors.headerText }]}>{t('main')}</Text>
                            </View>
                          )}
                        </View>
                      ))}
                      {images.length < 5 && (
                        <TouchableOpacity
                          style={[styles.addMoreImagesButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                          onPress={pickImageFromLibrary}
                        >
                          <Ionicons name="add-circle" size={24} color={colors.primary} />
                          <Text style={[styles.addMoreImagesText, { color: colors.textSecondary }]}>
                            {t('photosRemaining', { count: 5 - images.length })}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.submitButton, 
                    { backgroundColor: colors.primary, shadowColor: colors.shadow },
                    isSubmitting && { backgroundColor: colors.disabled }
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.headerText} size="small" />
                  ) : (
                    <>
                      <Ionicons
                        name={adType === 'sell' ? "pricetag-outline" : "search-outline"}
                        size={22}
                        color={colors.headerText}
                        style={styles.buttonIcon}
                      />
                      <Text style={[styles.submitButtonText, { color: colors.headerText }]}>
                        {adType === 'sell' ? t('placeAd') : t('Post Want to Buy')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </ErrorBoundaryWrapper>
      )}
    </Formik>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
  },
  formContainer: {
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 40,
    borderRadius: 20,
    padding: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  input: {
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 25, // More rounded corners
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  imagePickerText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: 10,
  },
  imagePreview: {
    width: '31%', // Slightly less than a third to account for gaps
    aspectRatio: 1,
    marginBottom: 8,
    borderRadius: 8,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    color: 'red',
    backgroundColor: 'transparent',
    padding: 5,
  },
  mainImageBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mainImageText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  addMoreImagesButton: {
    width: '31%', // Match the image preview width
    aspectRatio: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addMoreImagesText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  submitButton: {
    padding: 18,
    borderRadius: 25, // Match imagePickerButton radius
    alignItems: 'center',
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginRight: 12,
  },
  disabledButton: {
    // Lighter shade of primary color - will be applied inline
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  currencySymbol: {
    paddingHorizontal: 15,
    fontSize: 18,
    fontWeight: '600',
  },
  priceTextInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  // Add these new styles for enhanced image picker
  imagePickerButtonInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 87, 34, 0.1)', // Primary color with opacity
  },
  imagePickerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.2,
  },
  adTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingHorizontal: 10,
    gap: 10,
  },
  adTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 25,
    gap: 8,
    borderWidth: 1,
  },
  adTypeButtonActive: {
  },
  adTypeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  adTypeTextActive: {
  },
   errorText: {
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  mainImageBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 2,
  },
  mainImageText: {
    fontSize: 10,
    fontWeight: '600',
  },
  addMoreImagesButton: {
    width: (width - 80) / 3,
    height: (width - 80) / 3,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreImagesText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  signInPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  signInPromptContent: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
    maxWidth: 400,
  },
  signInPromptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  signInPromptText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  signInPromptButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  signInPromptButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButtonText: {
    fontSize: 16,
  },
});

export default PlaceAdScreen;
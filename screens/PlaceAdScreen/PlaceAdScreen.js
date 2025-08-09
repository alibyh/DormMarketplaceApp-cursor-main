import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import supabase from '../../services/supabaseConfig';
import ErrorBoundaryWrapper from '../../components/ErrorBoundary/ErrorBoundaryWrapper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { processImageForUpload, uploadImageToSupabase, getPublicUrl } from '../../utils/imageUtils';

const { width } = Dimensions.get('window');

const testBucketAccess = async () => {
  try {
    // Test bucket listing
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) throw bucketError;

    // Test product_images bucket
    const { data: productFiles, error: productError } = await supabase.storage
      .from('product_images')
      .list();

    // Test buy-orders-images bucket
    const { data: buyOrderFiles, error: buyOrderError } = await supabase.storage
      .from('buy-orders-images')
      .list();

    // Test public URL generation
    if (productFiles?.length > 0) {
      const { data: urlData } = await supabase.storage
        .from('product_images')
        .getPublicUrl(productFiles[0].name);
    }

  } catch (error) {
    console.error('Bucket access test failed:', error);
  }
};

const PlaceAdScreen = ({ navigation }) => {
  const { t } = useTranslation();
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
      const { data: { user }, error } = await supabase.auth.getUser();
      
      // Handle auth errors gracefully
      if (error) {
        console.log('Auth error (expected for unauthenticated users):', error);
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        return;
      }
      
      if (!user) {
        // User is not authenticated, show sign-in prompt
        Alert.alert(
          t('Authentication Required'),
          t('Please sign in to place an ad'),
          [
            {
              text: t('Cancel'),
              style: 'cancel',
              onPress: () => navigation.goBack()
            },
            {
              text: t('Sign In'),
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
        t('Error'),
        t('Unable to verify authentication'),
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
        Alert.alert('Error', 'Maximum 5 images allowed');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 5 - images.length,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => ({
          uri: asset.uri,
          type: 'image/jpeg',
          name: `photo_${Date.now()}.jpg`
        }));
        
        setImages(prev => [...prev, ...newImages].slice(0, 5));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Could not select image');
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
      console.log('Starting submission...');
      if (images.length === 0) {
        Alert.alert('Error', 'Please add at least one image');
        return;
      }

      setSubmitting(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if profile exists, create if it doesn't
      console.log('Checking user profile...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        console.log('Creating user profile...');
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

      // Create base record
      console.log('Creating product/order record...');
      const { data: newItem, error: insertError } = await supabase
        .from(values.adType === 'sell' ? 'products' : 'buy_orders')
        .insert([{
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
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      // Rest of your existing image upload code...
      const uploadedImages = [];
      for (let i = 0; i < images.length; i++) {
        try {
          const image = images[i];
          const fileName = `${newItem.id}/${Date.now()}_${i}.jpg`;
          const bucket = values.adType === 'sell' ? 'product_images' : 'buy-orders-images';

          // Convert image to binary data using the same method as SignUpScreen
          const fetchResponse = await fetch(image.uri);
          if (!fetchResponse.ok) {
            throw new Error('Failed to fetch image');
          }

          const arrayBuffer = await fetchResponse.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          // Upload using the same method as SignUpScreen
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fileName, uint8Array, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) {
            throw uploadError;
          }

          // Get the public URL
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);


          uploadedImages.push(fileName);

        } catch (error) {
          console.error(`Error uploading image ${i + 1}:`, error);
          Alert.alert(
            'Upload Error',
            `Failed to upload image ${i + 1}: ${error.message}`
          );
          throw error;
        }
      }

      // 3. Update record with image paths
      if (uploadedImages.length === 0) {
        throw new Error('No images were uploaded successfully');
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
        t('Success'),
        t(values.adType === 'sell' ? 'productPosted' : 'buyOrderPosted'),
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );

      setImages([]);
      resetForm();

    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert(
        'Error',
        error.message === 'Not authenticated' 
          ? 'Please log in to post items'
          : 'Failed to create listing. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff5722" />
        <Text style={styles.loadingText}>{t('Checking authentication...')}</Text>
      </View>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <View style={styles.signInPrompt}>
        <View style={styles.signInPromptContent}>
          <Ionicons name="person-circle-outline" size={80} color="#ff5722" />
          <Text style={styles.signInPromptTitle}>{t('Authentication Required')}</Text>
          <Text style={styles.signInPromptText}>
            {t('Please sign in to place an ad')}
          </Text>
          <TouchableOpacity
            style={styles.signInPromptButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.signInPromptButtonText}>{t('Sign In')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>{t('Go Back')}</Text>
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
            <ScrollView style={styles.container}>
              <View style={styles.header}>
                <Text style={styles.title}>{t('Place New Ad')}</Text>
                <View style={styles.adTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.adTypeButton,
                      adType === 'sell' && styles.adTypeButtonActive
                    ]}
                    onPress={() => handleAdTypeChange('sell')}
                  >
                    <Ionicons
                      name="pricetag-outline"
                      size={20}
                      color={adType === 'sell' ? '#fff' : '#104d59'}
                    />
                    <Text style={[
                      styles.adTypeText,
                      adType === 'sell' && styles.adTypeTextActive
                    ]}>
                      {t('Sell Item')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.adTypeButton,
                      adType === 'buy' && styles.adTypeButtonActive
                    ]}
                    onPress={() => handleAdTypeChange('buy')}
                  >
                    <Ionicons
                      name="search-outline"
                      size={20}
                      color={adType === 'buy' ? '#fff' : '#104d59'}
                    />
                    <Text style={[
                      styles.adTypeText,
                      adType === 'buy' && styles.adTypeTextActive
                    ]}>
                      {t('Want to Buy')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('Product Name')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={adType === 'sell' ? t('What are you selling?') : t('What are you looking for?')}
                    value={values.name}
                    onChangeText={handleChange('name')}
                    onBlur={handleBlur('name')}
                  />
                  {touched.name && errors.name && (
                    <Text style={styles.errorText}>{errors.name}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('Description')}</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder={adType === 'sell' ? t('Describe your item') : t('Describe what you want to buy')}
                    value={values.description}
                    onChangeText={handleChange('description')}
                    onBlur={handleBlur('description')}
                    multiline
                    numberOfLines={4}
                  />
                  {touched.description && errors.description && (
                    <Text style={styles.errorText}>{errors.description}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('Dorm/Location')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('Enter your dorm')}
                    value={values.dorm}
                    onChangeText={handleChange('dorm')}
                    onBlur={handleBlur('dorm')}
                  />
                  {touched.dorm && errors.dorm && (
                    <Text style={styles.errorText}>{errors.dorm}</Text>
                  )}
                </View>

                {adType === 'sell' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('Price (Rubles)')}</Text>
                    <View style={styles.priceInput}>
                      <Text style={styles.currencySymbol}>₽</Text>
                      <TextInput
                        style={styles.priceTextInput}
                        placeholder="0"
                        value={values.price}
                        onChangeText={handleChange('price')}
                        onBlur={handleBlur('price')}
                        keyboardType="numeric"
                      />
                    </View>
                    {touched.price && errors.price && (
                      <Text style={styles.errorText}>{t(errors.price)}</Text>
                    )}
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('Images (up to 5)')}</Text>
                  <TouchableOpacity
                    style={styles.imagePickerButton}
                    onPress={pickImageFromLibrary}
                  >
                    <View style={styles.imagePickerButtonInner} />
                    <AntDesign name="camera" size={24} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.imagePickerText}>
                      {images.length === 0 
                        ? t('addFirstPhoto')
                        : t('photosRemaining', { count: 5 - images.length })}
                    </Text>
                  </TouchableOpacity>
                </View>

                {images.length > 0 && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.subLabel}>{t('SelectedImages')}</Text>
                    <View style={styles.imagePreviewContainer}>
                      {images.map((image, index) => (
                        <View key={index} style={styles.imagePreview}>
                          <Image 
                            source={{ uri: image.uri }} 
                            style={styles.previewImage}
                            defaultSource={require('../../assets/placeholder.png')}
                          />
                          <View style={styles.imageOverlay} />
                          <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => removeImage(index)}
                          >
                            <Ionicons name="close-circle" size={22} color="#fff" />
                          </TouchableOpacity>
                          {index === 0 && (
                            <View style={styles.mainImageBadge}>
                              <Text style={styles.mainImageText}>{t('Main')}</Text>
                            </View>
                          )}
                        </View>
                      ))}
                      {images.length < 5 && (
                        <TouchableOpacity
                          style={styles.addMoreImagesButton}
                          onPress={pickImageFromLibrary}
                        >
                          <Ionicons name="add-circle" size={24} color="#ff794e" />
                          <Text style={styles.addMoreImagesText}>
                            {t('photosRemaining', { count: 5 - images.length })}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.submitButton, isSubmitting && styles.disabledButton]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Ionicons
                        name={adType === 'sell' ? "pricetag-outline" : "search-outline"}
                        size={22}
                        color="white"
                        style={styles.buttonIcon}
                      />
                      <Text style={styles.submitButtonText}>
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
    backgroundColor: '#F0F2F5',
  },
  header: {
    backgroundColor: '#104d59',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  formContainer: {
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
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
    color: '#2C3E50',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 16,
    color: '#2C3E50',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  imagePickerButton: {
    backgroundColor: '#ff794e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 25, // More rounded corners
    shadowColor: '#ff794e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  imagePickerText: {
    color: 'white',
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
    backgroundColor: '#ff794e',
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
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  addMoreImagesText: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#ff794e',
    padding: 18,
    borderRadius: 25, // Match imagePickerButton radius
    alignItems: 'center',
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#ff794e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginRight: 12,
  },
  disabledButton: {
    backgroundColor: '#ffccbc', // Lighter shade of primary color
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  currencySymbol: {
    paddingHorizontal: 15,
    fontSize: 18,
    color: '#ff794e',
    fontWeight: '600',
  },
  priceTextInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#2C3E50',
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
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 25,
    gap: 8,
  },
  adTypeButtonActive: {
    backgroundColor: '#ff794e',
  },
  adTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#104d59',
  },
  adTypeTextActive: {
    color: '#fff',
  },
   errorText: {
    color: '#ff3b30',
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
    backgroundColor: '#ff794e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 2,
  },
  mainImageText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  addMoreImagesButton: {
    width: (width - 80) / 3,
    height: (width - 80) / 3,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ff794e',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  addMoreImagesText: {
    color: '#ff794e',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  signInPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  signInPromptContent: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    shadowColor: '#000',
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
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  signInPromptText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  signInPromptButton: {
    backgroundColor: '#ff5722',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  signInPromptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

export default PlaceAdScreen;
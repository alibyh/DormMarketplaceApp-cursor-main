import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../services/supabaseConfig';
import ErrorBoundaryWrapper from '../../components/ErrorBoundary/ErrorBoundaryWrapper';
import { handleProductError } from '../../utils/productErrorHandler';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';

// Add these helper functions at the top of the file after imports
const debugLog = (message, data = null) => {
  const logMessage = `[EditAdScreen] ${message}`;
  if (data) {
    console.log(logMessage, JSON.stringify(data, null, 2));
  } else {
    console.log(logMessage);
  }
};

// Function to determine the correct bucket based on product type
const getImageBucket = (productType) => {
  return productType === 'buy' ? 'buy-orders-images' : 'product_images';
};

// Helper to clean storage URLs
const cleanStorageUrl = (url) => {
  if (!url) return '';
  // Remove any timestamp or cache params
  return url.split('?')[0];
};

// Helper to generate public URL for an image
const getPublicImageUrl = (path, productType) => {
  if (!path) return null;
  
  const bucket = getImageBucket(productType);
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  
  // If path already has the full URL, return it
  if (path.startsWith('http')) {
    return path;
  }
  
  // If path has the bucket already, we need to format correctly
  if (path.includes(`${bucket}/`)) {
    const relativePath = path.split(`${bucket}/`)[1];
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${relativePath}`;
  }
  
  // Otherwise, assume it's just the relative path
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
};

// Update the getImagePathFromUrl helper
const getImagePathFromUrl = (url, productType) => {
  if (!url) return null;
  
  const cleanUrl = cleanStorageUrl(url);
  const bucket = getImageBucket(productType);
  const regex = new RegExp(`${bucket}/(.+)$`);
  const matches = cleanUrl.match(regex);
  
  return matches ? matches[1] : null;
};

// Update the extractPathFromUrl function
const extractPathFromUrl = (url, productType) => {
  if (!url) return null;
  const cleanUrl = cleanStorageUrl(url);
  const bucket = getImageBucket(productType);
  const regex = new RegExp(`${bucket}/(.+)$`);
  const match = cleanUrl.match(regex);
  return match ? match[1] : null;
};

const EditAdScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { product } = route.params;
  const isBuyOrder = product.type === 'buy';
  
  // Update the initial mainPhoto state setup
  const [mainPhoto, setMainPhoto] = useState(() => {
    if (product.main_image_url) {
      if (product.main_image_url.startsWith('http')) {
        return cleanStorageUrl(product.main_image_url);
      }
      return `${supabase.storageUrl}/object/public/${getImageBucket(product.type)}/${product.main_image_url}`;
    }
    return null;
  });

  // Update additionalPhotos state initialization
  const [additionalPhotos, setAdditionalPhotos] = useState(() => {
    if (!product.images) return [];
    return product.images.map(img => cleanStorageUrl(img)).filter(img => 
      img !== mainPhoto && img !== product.main_image_url && img !== product.photoUrl
    );
  });

  const [isMainPhotoLoading, setIsMainPhotoLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(product.name || '');
  const [price, setPrice] = useState(isBuyOrder ? '' : (product.price?.toString() || ''));
  const [dorm, setDorm] = useState(product.dorm || '');
  const [description, setDescription] = useState(product.description || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update the pickMainPhoto function
  const pickMainPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setMainPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('error'), t('imagePickError'));
    }
  };

  // Add debugging to updateMainPhoto function
  const updateMainPhoto = async (uri, bucket, productId) => {
    try {
      setIsMainPhotoLoading(true);
      const mainPhotoFileName = `${productId}/main.jpg`;

      // First delete the old main photo if it exists
      try {
        const { data: existingFiles } = await supabase.storage
          .from(bucket)
          .list(productId);
        
        
        await supabase.storage
          .from(bucket)
          .remove([mainPhotoFileName]);
      } catch (error) {
        console.error('Error checking/deleting old main photo:', error);
      }

      // Upload new main photo
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(mainPhotoFileName, uint8Array, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      return mainPhotoFileName;

    } catch (error) {
      console.error('Main photo upload error:', error);
      throw error;
    } finally {
      setIsMainPhotoLoading(false);
    }
  };

  // Update the pickImage function to handle image compression
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setAdditionalPhotos(prev => [...prev, imageUri]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('error'), t('imagePickError'));
    }
  };

  // Update handleUpdate function's image handling section
  const handleUpdate = async () => {
    try {
      setIsSubmitting(true);

      // Validate all required fields
      if (!name.trim() || !dorm.trim() || !description.trim()) {
        Alert.alert(t('error'), t('fillAllFields'));
        return;
      }

      if (!isBuyOrder && !price) {
        Alert.alert(t('error'), t('priceRequired'));
        return;
      }

      if (!mainPhoto) {
        Alert.alert(t('error'), t('mainPhotoRequired'));
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const bucket = getImageBucket(product.type);
      let uploadedImages = [];
      let mainPhotoPath = null;

      // Handle main photo upload
      if (mainPhoto && (mainPhoto.startsWith('file://') || mainPhoto.startsWith('content://'))) {
        try {
          const fileName = `${product.id}/main_${Date.now()}.jpg`;
          const fetchResponse = await fetch(mainPhoto);
          const arrayBuffer = await fetchResponse.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fileName, uint8Array, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) throw uploadError;
          mainPhotoPath = fileName;
        } catch (error) {
          console.error('Error uploading main photo:', error);
          throw error;
        }
      } else {
        // Keep existing main photo path
        mainPhotoPath = extractPathFromUrl(mainPhoto, product.type);
      }

      // Handle additional photos
      if (additionalPhotos.length > 0) {
        for (let i = 0; i < additionalPhotos.length; i++) {
          const image = additionalPhotos[i];
          if (image.startsWith('file://') || image.startsWith('content://')) {
            // This is a new photo that needs to be uploaded
            try {
              const fileName = `${product.id}/${Date.now()}_${i}.jpg`;
              const fetchResponse = await fetch(image);
              const arrayBuffer = await fetchResponse.arrayBuffer();
              const uint8Array = new Uint8Array(arrayBuffer);

              const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(fileName, uint8Array, {
                  contentType: 'image/jpeg',
                  upsert: true
                });

              if (uploadError) throw uploadError;
              uploadedImages.push(fileName);
            } catch (error) {
              console.error(`Error uploading additional photo ${i}:`, error);
              throw error;
            }
          } else {
            // This is an existing photo
            const existingPath = extractPathFromUrl(image, product.type);
            if (existingPath) uploadedImages.push(existingPath);
          }
        }
      }

      // Prepare update data
      const updateData = {
        name: name.trim(),
        dorm: dorm.trim(),
        description: description.trim(),
        updated_at: new Date().toISOString()
      };

      if (mainPhotoPath) {
        updateData.main_image_url = mainPhotoPath;
      }

      if (uploadedImages.length > 0 || additionalPhotos.length === 0) {
        updateData.images = uploadedImages;
      }

      if (!isBuyOrder) {
        updateData.price = parseFloat(price);
      }

      // Update the database
      const { error: updateError } = await supabase
        .from(isBuyOrder ? 'buy_orders' : 'products')
        .update(updateData)
        .eq('id', product.id);

      if (updateError) throw updateError;

      Alert.alert(t('success'), t('productUpdated'), [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
            // Refresh both screens
            navigation.navigate('Account', { refresh: Date.now() });
            navigation.navigate('Home', { refresh: Date.now() });
          }
        }
      ]);

    } catch (error) {
      console.error('Update error:', error);
      Alert.alert(t('error'), t('updateError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update the removeImage function
  const removeImage = async (index) => {
    const imageToRemove = additionalPhotos[index];
    
    if (imageToRemove.startsWith('http')) {
      const imagePath = getImagePathFromUrl(imageToRemove, product.type);
      if (imagePath) {
        const bucket = getImageBucket(product.type);
        try {
          const { error: deleteError } = await supabase.storage
            .from(bucket)
            .remove([imagePath]);

          if (deleteError) {
            console.error('Error removing image:', deleteError);
            Alert.alert(t('error'), t('imageDeleteError'));
            return;
          }
        } catch (error) {
          console.error('Error removing image:', error);
          Alert.alert(t('error'), t('imageDeleteError'));
          return;
        }
      }
    }

    setAdditionalPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // In the handleDeleteProduct function
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
                  .select('main_image_url, photoUrl, images')
                  .eq('id', productId)
                  .single();

                if (fetchError) throw fetchError;

                // 2. Delete all images from storage
                if (product) {
                  // Get image path from either main_image_url or photoUrl
                  const mainPhotoUrl = product.main_image_url || product.photoUrl;
                  
                  const imagesToDelete = [];
                  
                  // Add main photo path if exists
                  if (mainPhotoUrl) {
                    const mainPhotoPath = mainPhotoUrl.split('/').pop();
                    if (mainPhotoPath) {
                      imagesToDelete.push(`${productId}/${mainPhotoPath}`);
                    }
                  }

                  // Add additional images paths
                  if (product.images && Array.isArray(product.images)) {
                    const additionalPaths = product.images.map(img => {
                      const path = img.split('/').pop();
                      return `${productId}/${path}`;
                    });
                    imagesToDelete.push(...additionalPaths);
                  }


                  // Delete each image
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

  const Header = () => {
    const { t } = useTranslation();
    
    return (
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#ff5722" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('editProduct')}</Text>
        <View style={styles.placeholder} />
      </View>
    );
  };

  return (
    <ErrorBoundaryWrapper>
      <SafeAreaView style={styles.container}>
        <Header />
        <ScrollView 
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Main Photo Section */}
          <View style={styles.mainPhotoContainer}>
            <ErrorBoundaryWrapper>
              {mainPhoto ? (
                <>
                  <Image
                    source={{ uri: mainPhoto }}
                    style={styles.mainPhotoImage}
                    resizeMode="cover"
                    defaultSource={require('../../assets/placeholder.png')}
                    onError={(error) => {
                      console.error('Image loading error:', error.nativeEvent.error);
                      console.error('Failed to load URL:', mainPhoto);
                      Alert.alert(t('error'), t('imageLoadError'));
                    }}
                  />
                </>
              ) : (
                <>
                  <View style={styles.mainPhotoPlaceholder}>
                    <Ionicons name="image-outline" size={50} color="#666" />
                    <Text style={styles.placeholderText}>{t('mainProductPhoto')}</Text>
                  </View>
                </>
              )}
            </ErrorBoundaryWrapper>
            <TouchableOpacity
              style={styles.updateMainPhotoButton}
              onPress={pickMainPhoto}
              disabled={isMainPhotoLoading}
            >
              {isMainPhotoLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={24} color="#fff" />
                  <Text style={styles.updateMainPhotoText}>
                    {mainPhoto ? t('changeMainPhoto') : t('addMainPhoto')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('productName')}
            placeholderTextColor="#999"
          />

          {!isBuyOrder && (
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder={t('price')}
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />
          )}

          <TextInput
            style={styles.input}
            value={dorm}
            onChangeText={setDorm}
            placeholder={t('dorm')}
            placeholderTextColor="#999"
          />

          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('description')}
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />

          <TouchableOpacity 
            style={styles.imagePickerButton} 
            onPress={pickImage}
          >
            <Text style={styles.imagePickerText}>{t('addAdditionalImages')}</Text>
          </TouchableOpacity>

          <ScrollView 
            horizontal 
            style={styles.imagePreviewContainer}
            showsHorizontalScrollIndicator={false}
          >
            {additionalPhotos.map((image, index) => (
              <View key={index} style={styles.imagePreviewWrapper}>
                <Image 
                  source={{ uri: image }} 
                  style={styles.imagePreview} 
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#ff3b30" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </ScrollView>
        
        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[
              styles.button,
              styles.cancelButton,
              isSubmitting && styles.disabledButton
            ]}
            onPress={() => navigation.goBack()}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.button,
              styles.updateButton,
              (isSubmitting || !mainPhoto) && styles.disabledButton
            ]}
            onPress={handleUpdate}
            disabled={isSubmitting || !mainPhoto}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.updateButtonText}>{t('updateProduct')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <LoadingOverlay
          isVisible={isSubmitting}
          message={t('updatingProduct')}
          onTimeout={() => {
            setIsSubmitting(false);
            Alert.alert(t('error'), t('updateTimeout'));
          }}
        />
      </SafeAreaView>
    </ErrorBoundaryWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff5722',
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  imagePickerButton: {
    backgroundColor: '#ff5722',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  imagePickerText: {
    color: '#fff',
    fontWeight: '600',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  imagePreviewWrapper: {
    marginRight: 10,
    position: 'relative',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  updateButton: {
    backgroundColor: '#ff5722',
  },
  updateButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff5722',
  },
  cancelButtonText: {
    color: '#ff5722',
    fontWeight: 'bold',
    fontSize: 16,
  },
  mainPhotoContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  mainPhotoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mainPhotoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateMainPhotoButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: '#ff5722',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  updateMainPhotoText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    width: 40, // Same as backButton width
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default EditAdScreen;
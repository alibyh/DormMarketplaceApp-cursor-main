import * as ImageManipulator from 'expo-image-manipulator';
import supabase from '../services/supabaseConfig';
import * as FileSystem from 'expo-file-system';

export const processImage = async (image) => {
  console.log('Starting image processing...', image?.uri);
  
  if (!image || !image.uri) {
    console.error('Invalid image object received:', image);
    throw new Error('Invalid image object');
  }

  try {
    // Get the image extension
    const extension = image.uri.split('.').pop().toLowerCase();
    const isGif = extension === 'gif';
    console.log('Image type:', isGif ? 'GIF' : 'Other format');

    // Don't process GIFs
    if (isGif) {
      console.log('Processing GIF...');
      const response = await fetch(image.uri);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      return blob;
    }

    // Process other image types
    console.log('Processing image with manipulator...');
    const manipResult = await ImageManipulator.manipulateAsync(
      image.uri,
      [{ resize: { width: 1200, height: 1200 } }],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG
      }
    );

    if (!manipResult.uri) {
      throw new Error('Image manipulation failed - no URI returned');
    }

    console.log('Converting to blob...');
    const response = await fetch(manipResult.uri);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    
    console.log('Image processing completed successfully');
    return blob;

  } catch (error) {
    console.error('Detailed image processing error:', {
      error: error.message,
      stack: error.stack,
      imageUri: image?.uri
    });
    throw error; // Re-throw the error for handling upstream
  }
};

export const retryImageLoad = async (url, maxRetries = 3) => {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        timeout: 5000
      });
      
      if (response.ok) {
        return url;
      }
    } catch (error) {
      console.log(`Attempt ${attempts + 1} failed for ${url}`);
    }
    
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
  }
  
  return 'https://via.placeholder.com/150';
};

export const getImageUrl = (imagePath, bucket = 'product_images') => {
  if (!imagePath) return null;
  
  // If it's already a full URL, return it
  if (imagePath.startsWith('http')) return imagePath;
  
  // Get public URL from Supabase storage
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(imagePath);
    
  return data?.publicUrl || null;
};

export const getAvatarUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(url);
    
  return data?.publicUrl || null;
};

export const processImageForUpload = async (imageUri) => {
  try {
    // Read the file info
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!fileInfo.exists) {
      throw new Error('Image file not found');
    }

    // Read the file as base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to blob
    const blob = await new Promise((resolve, reject) => {
      const Blob = global.Blob;
      const dataUrl = `data:image/jpeg;base64,${base64}`;
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => resolve(blob))
        .catch(err => reject(err));
    });

    return blob;
  } catch (error) {
    console.error('Image processing error:', error);
    throw error;
  }
};

export const uploadImageToSupabase = async (blob, fileName, bucket) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
};

export const getPublicUrl = (path, bucket) => {
  if (!path) return null;
  
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
    
  return data?.publicUrl || null;
};

export const cleanStorageUrl = (url) => {
  if (!url) return null;
  
  const baseUrl = 'https://hiqscrnxzgotgieihnzh.supabase.co/storage/v1/object/public/product_images/';
  
  // If it's just a path (no http), add the base URL
  if (!url.startsWith('http')) {
    return baseUrl + url;
  }
  
  // If it's already a full URL, clean any duplicates
  const path = url.split('product_images/').pop();
  if (path) {
    return baseUrl + path;
  }
  
  return url;
};

// Export as both named and default export
export default {
  processImage
};
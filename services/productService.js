import supabase from './supabaseConfig';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Create a new product
export const createProduct = async (productData, imageFiles = []) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User must be logged in');

    // 1. Create the product first
    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert({
        name: productData.name,
        description: productData.description,
        dorm: productData.dorm,
        price: parseFloat(productData.price),
        seller_id: user.id,
        is_deleted: false,
        is_visible: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. Upload images and collect their paths
    const imagePaths = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const image = imageFiles[i];
      
      // Convert image to binary data
      const fetchResponse = await fetch(image.uri);
      if (!fetchResponse.ok) throw new Error('Failed to fetch image');
      
      const arrayBuffer = await fetchResponse.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const fileName = `${product.id}/${Date.now()}_${i}.jpg`;

      // Upload image
      const { error: uploadError } = await supabase.storage
        .from('product_images')
        .upload(fileName, uint8Array, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;
      imagePaths.push(fileName);
    }

    // 3. Update product with image paths
    const { error: updateError } = await supabase
      .from('products')
      .update({
        images: imagePaths,
        main_image_url: imagePaths[0]
      })
      .eq('id', product.id);

    if (updateError) throw updateError;

    return { data: product, error: null };
  } catch (error) {
    console.error("Product creation failed:", error);
    return { data: null, error };
  }
};

// Get all products
export const getAllProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        profiles:seller_id (username, id),
        product_images (image_url)
      `)
      .eq('is_deleted', false)
      .eq('is_visible', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get all products error:', error);
    throw error;
  }
};

// Get a product by ID
export const getProductById = async (productId, type = 'sell') => {
  try {
    const tableName = type === 'sell' ? 'products' : 'buy_orders';
    const { data, error } = await supabase
      .from(tableName)
      .select(`
        *,
        profiles:${type === 'sell' ? 'seller_id' : 'user_id'} (
          username,
          id
        )
      `)
      .eq('id', productId)
      .single();

    if (error) throw error;
    
    if (!data) throw new Error('Product not found');

    // Get image URLs
    if (data.images?.length > 0) {
      const bucket = type === 'sell' ? 'product_images' : 'buy-orders-images';
      data.processedImages = data.images.map(imagePath => {
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(imagePath);
        return { url: urlData?.publicUrl };
      });
    }

    console.log('Product query result: Success');
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching product:', error);
    return { data: null, error };
  }
};

// Get products by seller ID
export const getProductsBySellerId = async (sellerId) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        profiles:seller_id (username, id),
        product_images (image_url)
      `)
      .eq('seller_id', sellerId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get products by seller ID error:', error);
    throw error;
  }
};

// Update a product
export const updateProduct = async (productId, updates) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Update product error:', error);
    throw error;
  }
};

// Delete a product (soft delete)
export const deleteProduct = async (productId) => {
  try {
    const { error } = await supabase
      .from('products')
      .update({ is_deleted: true })
      .eq('id', productId);

    if (error) throw error;
  } catch (error) {
    console.error('Delete product error:', error);
    throw error;
  }
};

// Get all banners
export const getBanners = async () => {
  try {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get banners error:', error);
    throw error;
  }
};

// Create a new banner
export const createBanner = async (imageFile) => {
  try {
    // Upload the image
    const fileExt = imageFile._source.type.split('/')[1] || 'jpg';
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    const { error: uploadError } = await supabase
      .storage
      .from('banners')
      .upload(filePath, imageFile._source, {
        contentType: imageFile._source.type
      });

    if (uploadError) throw uploadError;

    // Get the public URL
    const { data: publicUrlData } = supabase
      .storage
      .from('banners')
      .getPublicUrl(filePath);

    // Create banner record
    const { data: banner, error } = await supabase
      .from('banners')
      .insert([{
        image_url: publicUrlData.publicUrl,
        file_path: filePath,
        is_active: true
      }])
      .select()
      .single();

    if (error) throw error;
    return banner;
  } catch (error) {
    console.error('Create banner error:', error);
    throw error;
  }
};

export const testStorageAccess = async () => {
  try {
    console.log("=== STORAGE ACCESS TEST ===");
    
    // Check authentication
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error("Authentication error:", userError);
      return { success: false, error: "Authentication failed" };
    }
    
    console.log("Authenticated as:", userData.user.email);
    
    // List buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.error("Error listing buckets:", bucketError);
      return { success: false, error: "Cannot list buckets" };
    }
    
    console.log("Available buckets:", buckets.map(b => b.name).join(", "));
    
    // Try a very simple upload - just a few bytes
    const testFileName = `test-${Date.now()}.txt`;
    
    // Simple constant content - no Blob needed
    const content = 'test' + Date.now();
    const contentBytes = new TextEncoder().encode(content);
    
    console.log("Uploading test file:", testFileName);
    
    // Upload the small file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product_images')
      .upload(testFileName, contentBytes, {
        contentType: 'text/plain'
      });
      
    if (uploadError) {
      console.error("Upload failed:", uploadError);
      return { success: false, error: "File upload failed: " + uploadError.message };
    }
    
    console.log("Test upload succeeded:", uploadData);
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('product_images')
      .getPublicUrl(testFileName);
      
    if (!urlData?.publicUrl) {
      console.error("Failed to get public URL");
      return { success: false, error: "Could not get public URL" };
    }
    
    console.log("Got public URL:", urlData.publicUrl);
    
    // Skip the database insertion part since it requires a valid product ID
    console.log("Skipping database insertion test (requires valid product ID)");
    console.log("=== STORAGE TEST SUCCESSFUL ===");
    
    return {
      success: true,
      message: "Storage is working correctly! The file upload and URL generation succeeded.",
      url: urlData.publicUrl
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { success: false, error: error.message };
  }
};

export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  const { data } = supabase.storage
    .from('product_images')
    .getPublicUrl(imagePath);
  return data?.publicUrl;
};
import supabase from './supabaseConfig';
import { processImage } from '../utils/imageUtils';
import * as FileSystem from 'expo-file-system';

export const createBuyOrder = async (orderData, imageFiles = []) => {
  try {
    console.log("=== START BUY ORDER CREATION ===");
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User must be logged in');

    // 1. First create the buy order
    const { data: order, error: insertError } = await supabase
      .from('buy_orders')
      .insert({
        name: orderData.name,
        description: orderData.description,
        dorm: orderData.dorm,
        user_id: user.id,
        status: 'active',
        is_visible: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. Upload images (optimized)
    const uploadedUrls = [];
    if (imageFiles.length > 0) {
      const uploadPromises = imageFiles.map(async (image, index) => {
        try {
          const response = await fetch(image.uri);
          const blob = await response.blob();
          const fileName = `${order.id}/${Date.now()}_${index}.jpg`;

          const { error: uploadError } = await supabase.storage
            .from('buy-orders-images')
            .upload(fileName, blob);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('buy-orders-images')
            .getPublicUrl(fileName);

          return publicUrl;
        } catch (error) {
          console.error(`Failed to upload image ${index}:`, error);
          throw error;
        }
      });

      uploadedUrls.push(...(await Promise.all(uploadPromises)));
    }

    // 3. Update order with main image and additional images
    const { error: updateError } = await supabase
      .from('buy_orders')
      .update({
        main_image_url: uploadedUrls[0],
        additional_images: uploadedUrls.slice(1)
      })
      .eq('id', order.id);

    if (updateError) throw updateError;

    // 4. Increment user's product count for buy orders
    try {
      const { error: countError } = await supabase
        .from('profiles')
        .update({ 
          product_count: supabase.sql`COALESCE(product_count, 0) + 1` 
        })
        .eq('id', user.id);
      
      if (countError) {
        console.warn('Failed to increment product count for buy order:', countError);
        // Don't throw error here as buy order creation was successful
      }
    } catch (countError) {
      console.warn('Failed to increment product count for buy order:', countError);
      // Don't throw error here as buy order creation was successful
    }

    return { data: order, error: null };
  } catch (error) {
    console.error("Buy order creation failed:", error);
    return { data: null, error };
  }
};
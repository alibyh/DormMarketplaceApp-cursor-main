const { createClient } = require('@supabase/supabase-js');

// Use the same configuration as the app
const SUPABASE_URL = 'https://hiqscrnxzgotgieihnzh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpcXNjcm54emdvdGdpZWlobnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5NDg3NDYsImV4cCI6MjA1OTUyNDc0Nn0.YP-4RO401mp_6qU39Sw0iCnmLHtqyjAp6wIEnU8_z6E';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testBuyOrderUpload() {
  console.log('🔍 Testing Buy Order Creation and Image Upload...\n');

  try {
    // Step 1: Create a test buy order record
    console.log('1. Creating test buy order record...');
    
    const testBuyOrder = {
      name: 'Test Buy Order - Image Upload Test',
      description: 'Testing image upload functionality',
      dorm: 'Test Dorm',
      user_id: '00000000-0000-0000-0000-000000000000', // Dummy user ID
      created_at: new Date().toISOString(),
      is_available: true,
      main_image_url: null,
      images: []
    };

    const { data: newBuyOrder, error: insertError } = await supabase
      .from('buy_orders')
      .insert([testBuyOrder])
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '42501') {
        console.error('❌ RLS policy error - need to fix database permissions');
        console.log('   Run: scripts/fix-buy-orders-rls.sql');
        return;
      } else {
        console.error('❌ Failed to create buy order:', insertError);
        return;
      }
    }

    console.log('✅ Buy order created successfully:', newBuyOrder.id);

    // Step 2: Test bucket access using the new method
    console.log('\n2. Testing bucket access...');
    
    const bucket = 'buy-orders-images';
    let bucketAccessible = false;
    
    try {
      const { data: bucketFiles, error: bucketListError } = await supabase.storage
        .from(bucket)
        .list('', { limit: 1 });
      
      if (bucketListError) {
        console.warn(`❌ Bucket ${bucket} not accessible: ${bucketListError.message}`);
        // Try fallback bucket
        const fallbackBucket = 'product_images';
        const { data: fallbackFiles, error: fallbackError } = await supabase.storage
          .from(fallbackBucket)
          .list('', { limit: 1 });
        
        if (fallbackError) {
          console.error(`❌ Fallback bucket ${fallbackBucket} also not accessible: ${fallbackError.message}`);
          return;
        } else {
          bucketAccessible = true;
          console.log(`✅ Using fallback bucket: ${fallbackBucket}`);
        }
      } else {
        bucketAccessible = true;
        console.log(`✅ Bucket ${bucket} is accessible`);
      }
    } catch (accessError) {
      console.error(`❌ Error checking bucket access: ${accessError.message}`);
      return;
    }

    // Step 3: Test image upload
    console.log('\n3. Testing image upload...');
    
    const testImageData = Buffer.from('fake-jpeg-data-for-testing', 'utf8');
    const fileName = `${newBuyOrder.id}/${Date.now()}_0.jpg`;
    
    console.log(`   Uploading to: ${bucket}/${fileName}`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, testImageData, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('❌ Image upload failed:', uploadError);
    } else {
      console.log('✅ Image upload successful:', uploadData.path);
      
      // Step 4: Test public URL generation
      console.log('\n4. Testing public URL generation...');
      
      const { data: urlData, error: urlError } = await supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      if (urlError) {
        console.error('❌ Public URL generation failed:', urlError);
      } else {
        console.log('✅ Public URL generated:', urlData.publicUrl);
      }

      // Step 5: Update the buy order record with image info
      console.log('\n5. Updating buy order with image info...');
      
      const { error: updateError } = await supabase
        .from('buy_orders')
        .update({
          main_image_url: fileName,
          images: [fileName],
          updated_at: new Date().toISOString()
        })
        .eq('id', newBuyOrder.id);

      if (updateError) {
        console.error('❌ Failed to update buy order:', updateError);
      } else {
        console.log('✅ Buy order updated with image successfully');
      }

      // Step 6: Clean up test data
      console.log('\n6. Cleaning up test data...');
      
      // Remove test image
      const { error: deleteImageError } = await supabase.storage
        .from(bucket)
        .remove([fileName]);
      
      if (deleteImageError) {
        console.warn('⚠️  Could not clean up test image:', deleteImageError.message);
      } else {
        console.log('✅ Test image cleaned up');
      }
    }

    // Remove test buy order
    const { error: deleteOrderError } = await supabase
      .from('buy_orders')
      .delete()
      .eq('id', newBuyOrder.id);

    if (deleteOrderError) {
      console.warn('⚠️  Could not clean up test buy order:', deleteOrderError.message);
    } else {
      console.log('✅ Test buy order cleaned up');
    }

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
  }
}

// Run the test
testBuyOrderUpload().then(() => {
  console.log('\n🏁 Buy order upload test completed');
  console.log('\n📋 Summary:');
  console.log('- If RLS error: Run scripts/fix-buy-orders-rls.sql');
  console.log('- If bucket access fails: Check storage permissions');
  console.log('- If upload works: The fix is working correctly');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});


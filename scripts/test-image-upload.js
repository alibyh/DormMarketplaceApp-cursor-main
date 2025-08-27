const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Use the same configuration as the app
const SUPABASE_URL = 'https://hiqscrnxzgotgieihnzh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpcXNjcm54emdvdGdpZWlobnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5NDg3NDYsImV4cCI6MjA1OTUyNDc0Nn0.YP-4RO401mp_6qU39Sw0iCnmLHtqyjAp6wIEnU8_z6E';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testImageUpload() {
  console.log('🔍 Testing Image Upload Process...\n');

  try {
    // Create a test image file
    const testImagePath = path.join(__dirname, 'test-image.jpg');
    const testImageData = Buffer.from('fake-jpeg-data', 'utf8');
    
    // Write a simple test file
    fs.writeFileSync(testImagePath, testImageData);
    console.log('✅ Created test image file');

    // Test 1: Upload to product_images bucket
    console.log('\n1. Testing upload to product_images bucket...');
    const productFileName = `test-product-${Date.now()}.jpg`;
    
    const { data: productUploadData, error: productUploadError } = await supabase.storage
      .from('product_images')
      .upload(productFileName, testImageData, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '3600'
      });

    if (productUploadError) {
      console.error('❌ Product images upload failed:', productUploadError);
    } else {
      console.log('✅ Product images upload successful');
      console.log(`   File path: ${productUploadData.path}`);
      
      // Test public URL
      const { data: productUrlData } = supabase.storage
        .from('product_images')
        .getPublicUrl(productFileName);
      console.log(`   Public URL: ${productUrlData.publicUrl}`);
      
      // Clean up
      await supabase.storage.from('product_images').remove([productFileName]);
      console.log('✅ Product test file cleaned up');
    }

    // Test 2: Upload to buy-orders-images bucket
    console.log('\n2. Testing upload to buy-orders-images bucket...');
    const buyOrderFileName = `test-buyorder-${Date.now()}.jpg`;
    
    const { data: buyOrderUploadData, error: buyOrderUploadError } = await supabase.storage
      .from('buy-orders-images')
      .upload(buyOrderFileName, testImageData, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '3600'
      });

    if (buyOrderUploadError) {
      console.error('❌ Buy orders images upload failed:', buyOrderUploadError);
      console.error('   Error details:', {
        message: buyOrderUploadError.message,
        code: buyOrderUploadError.code,
        details: buyOrderUploadError.details,
        hint: buyOrderUploadError.hint
      });
    } else {
      console.log('✅ Buy orders images upload successful');
      console.log(`   File path: ${buyOrderUploadData.path}`);
      
      // Test public URL
      const { data: buyOrderUrlData } = supabase.storage
        .from('buy-orders-images')
        .getPublicUrl(buyOrderFileName);
      console.log(`   Public URL: ${buyOrderUrlData.publicUrl}`);
      
      // Clean up
      await supabase.storage.from('buy-orders-images').remove([buyOrderFileName]);
      console.log('✅ Buy order test file cleaned up');
    }

    // Test 3: Simulate the exact process from PlaceAdScreen
    console.log('\n3. Testing exact PlaceAdScreen upload process...');
    
    // Simulate creating a buy order record first
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Dummy user ID
    const testBuyOrder = {
      name: 'Test Buy Order',
      description: 'Test description',
      dorm: 'Test Dorm',
      user_id: testUserId,
      created_at: new Date().toISOString(),
      is_available: true,
      main_image_url: null,
      images: []
    };

    console.log('   Creating test buy order record...');
    const { data: newBuyOrder, error: insertError } = await supabase
      .from('buy_orders')
      .insert([testBuyOrder])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to create test buy order:', insertError);
    } else {
      console.log('✅ Test buy order created:', newBuyOrder.id);
      
      // Now test the image upload process
      const fileName = `${newBuyOrder.id}/${Date.now()}_0.jpg`;
      const bucket = 'buy-orders-images';
      
      console.log(`   Uploading image to ${bucket}/${fileName}...`);
      
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
        console.log('✅ Image upload successful');
        
        // Test updating the record
        const { error: updateError } = await supabase
          .from('buy_orders')
          .update({
            main_image_url: fileName,
            images: [fileName],
            updated_at: new Date().toISOString()
          })
          .eq('id', newBuyOrder.id);

        if (updateError) {
          console.error('❌ Failed to update buy order with image:', updateError);
        } else {
          console.log('✅ Buy order updated with image successfully');
        }
      }
      
      // Clean up test record
      await supabase.from('buy_orders').delete().eq('id', newBuyOrder.id);
      console.log('✅ Test buy order cleaned up');
    }

    // Clean up test file
    fs.unlinkSync(testImagePath);
    console.log('\n✅ Test image file cleaned up');

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
  }
}

// Run the test
testImageUpload().then(() => {
  console.log('\n🏁 Image upload test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

const { createClient } = require('@supabase/supabase-js');

// Use the same configuration as the app
const SUPABASE_URL = 'https://hiqscrnxzgotgieihnzh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpcXNjcm54emdvdGdpZWlobnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5NDg3NDYsImV4cCI6MjA1OTUyNDc0Nn0.YP-4RO401mp_6qU39Sw0iCnmLHtqyjAp6wIEnU8_z6E';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testStorageBuckets() {
  console.log('🔍 Testing Supabase Storage Buckets...\n');

  try {
    // 1. List all buckets
    console.log('1. Listing all storage buckets...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError);
      return;
    }

    console.log('✅ Available buckets:', buckets?.map(b => b.name) || []);
    console.log('');

    // 2. Test product_images bucket
    console.log('2. Testing product_images bucket...');
    const { data: productFiles, error: productError } = await supabase.storage
      .from('product_images')
      .list();

    if (productError) {
      console.error('❌ Error accessing product_images bucket:', productError);
    } else {
      console.log('✅ product_images bucket accessible');
      console.log(`   Files count: ${productFiles?.length || 0}`);
      if (productFiles?.length > 0) {
        console.log(`   Sample file: ${productFiles[0].name}`);
      }
    }
    console.log('');

    // 3. Test buy-orders-images bucket
    console.log('3. Testing buy-orders-images bucket...');
    const { data: buyOrderFiles, error: buyOrderError } = await supabase.storage
      .from('buy-orders-images')
      .list();

    if (buyOrderError) {
      console.error('❌ Error accessing buy-orders-images bucket:', buyOrderError);
      console.log('   This might be the cause of the upload issues!');
    } else {
      console.log('✅ buy-orders-images bucket accessible');
      console.log(`   Files count: ${buyOrderFiles?.length || 0}`);
      if (buyOrderFiles?.length > 0) {
        console.log(`   Sample file: ${buyOrderFiles[0].name}`);
      }
    }
    console.log('');

    // 4. Test public URL generation
    console.log('4. Testing public URL generation...');
    if (productFiles?.length > 0) {
      const { data: urlData, error: urlError } = await supabase.storage
        .from('product_images')
        .getPublicUrl(productFiles[0].name);
      
      if (urlError) {
        console.error('❌ Error generating public URL:', urlError);
      } else {
        console.log('✅ Public URL generation working');
        console.log(`   Sample URL: ${urlData.publicUrl}`);
      }
    } else {
      console.log('⚠️  No files in product_images to test URL generation');
    }
    console.log('');

    // 5. Test upload permissions (create a test file)
    console.log('5. Testing upload permissions...');
    const testFileName = `test-upload-${Date.now()}.txt`;
    const testContent = 'This is a test file to check upload permissions';
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product_images')
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
    } else {
      console.log('✅ Upload test successful');
      console.log(`   Uploaded file: ${uploadData.path}`);
      
      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('product_images')
        .remove([testFileName]);
      
      if (deleteError) {
        console.warn('⚠️  Could not clean up test file:', deleteError);
      } else {
        console.log('✅ Test file cleaned up');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
  }
}

// Run the test
testStorageBuckets().then(() => {
  console.log('\n🏁 Storage bucket test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

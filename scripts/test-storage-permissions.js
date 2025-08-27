const { createClient } = require('@supabase/supabase-js');

// Use the same configuration as the app
const SUPABASE_URL = 'https://hiqscrnxzgotgieihnzh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpcXNjcm54emdvdGdpZWlobnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5NDg3NDYsImV4cCI6MjA1OTUyNDc0Nn0.YP-4RO401mp_6qU39Sw0iCnmLHtqyjAp6wIEnU8_z6E';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testStoragePermissions() {
  console.log('🔍 Testing Storage Bucket Permissions...\n');

  try {
    // Test 1: List all buckets
    console.log('1. Listing all storage buckets...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError);
      console.error('   This suggests a storage permissions issue');
    } else {
      console.log('✅ Buckets listed successfully');
      console.log('   Available buckets:', buckets?.map(b => b.name) || []);
      console.log('   Total buckets found:', buckets?.length || 0);
    }
    console.log('');

    // Test 2: Try to access each bucket individually
    const bucketNames = ['buy-orders-images', 'product_images', 'products_images', 'banners', 'avatars'];
    
    console.log('2. Testing individual bucket access...');
    for (const bucketName of bucketNames) {
      try {
        const { data: files, error: listError } = await supabase.storage
          .from(bucketName)
          .list();

        if (listError) {
          console.log(`❌ ${bucketName}: ${listError.message}`);
        } else {
          console.log(`✅ ${bucketName}: Accessible (${files?.length || 0} files)`);
        }
      } catch (error) {
        console.log(`❌ ${bucketName}: ${error.message}`);
      }
    }
    console.log('');

    // Test 3: Test upload permissions
    console.log('3. Testing upload permissions...');
    const testBuckets = ['buy-orders-images', 'product_images'];
    
    for (const bucketName of testBuckets) {
      try {
        const testFileName = `test-upload-${Date.now()}.txt`;
        const testContent = 'Test upload content';
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(testFileName, testContent, {
            contentType: 'text/plain',
            upsert: true
          });

        if (uploadError) {
          console.log(`❌ ${bucketName} upload failed: ${uploadError.message}`);
        } else {
          console.log(`✅ ${bucketName} upload successful: ${uploadData.path}`);
          
          // Clean up test file
          const { error: deleteError } = await supabase.storage
            .from(bucketName)
            .remove([testFileName]);
          
          if (deleteError) {
            console.log(`⚠️  ${bucketName} cleanup failed: ${deleteError.message}`);
          } else {
            console.log(`✅ ${bucketName} test file cleaned up`);
          }
        }
      } catch (error) {
        console.log(`❌ ${bucketName} upload test failed: ${error.message}`);
      }
    }
    console.log('');

    // Test 4: Check storage policies
    console.log('4. Checking storage policies...');
    
    // Try to get public URLs for existing files
    const testBucketsWithFiles = ['buy-orders-images', 'product_images'];
    
    for (const bucketName of testBucketsWithFiles) {
      try {
        const { data: files, error: listError } = await supabase.storage
          .from(bucketName)
          .list();

        if (!listError && files && files.length > 0) {
          const testFile = files[0];
          const { data: urlData, error: urlError } = await supabase.storage
            .from(bucketName)
            .getPublicUrl(testFile.name);

          if (urlError) {
            console.log(`❌ ${bucketName} public URL failed: ${urlError.message}`);
          } else {
            console.log(`✅ ${bucketName} public URL working: ${urlData.publicUrl}`);
          }
        } else {
          console.log(`⚠️  ${bucketName}: No files to test public URL`);
        }
      } catch (error) {
        console.log(`❌ ${bucketName} public URL test failed: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
  }
}

// Run the test
testStoragePermissions().then(() => {
  console.log('\n🏁 Storage permissions test completed');
  console.log('\n📋 Analysis:');
  console.log('- If buckets are listed but individual access fails: Storage policies issue');
  console.log('- If buckets are not listed: Storage API permissions issue');
  console.log('- If uploads fail: Storage write permissions issue');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});


const { createClient } = require('@supabase/supabase-js');

// Use the same configuration as the app
const SUPABASE_URL = 'https://hiqscrnxzgotgieihnzh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpcXNjcm54emdvdGdpZWlobnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5NDg3NDYsImV4cCI6MjA1OTUyNDc0Nn0.YP-4RO401mp_6qU39Sw0iCnmLHtqyjAp6wIEnU8_z6E';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testFunctions() {
  console.log('🔍 Testing Database Functions...\n');

  try {
    // Test 1: Check if functions exist
    console.log('1. Checking if functions exist...');
    
    const { data: functions, error: functionsError } = await supabase.rpc(
      'pg_proc',
      {},
      { count: 'exact' }
    );

    if (functionsError) {
      console.error('❌ Error checking functions:', functionsError);
    } else {
      console.log('✅ Functions check completed');
    }

    // Test 2: Try to call the buy order function (this will fail without auth, but shows if it exists)
    console.log('\n2. Testing buy order function...');
    
    try {
      const { data: buyOrderData, error: buyOrderError } = await supabase.rpc(
        'create_buy_order_with_auth',
        {
          p_name: 'Test Buy Order',
          p_description: 'Test description',
          p_dorm: 'Test Dorm',
          p_user_id: '00000000-0000-0000-0000-000000000000'
        }
      );

      if (buyOrderError) {
        if (buyOrderError.code === '42883') {
          console.error('❌ Function create_buy_order_with_auth does not exist');
          console.log('   You need to run the SQL script: scripts/create-buy-order-function.sql');
        } else {
          console.log('✅ Function exists (expected auth error):', buyOrderError.message);
        }
      } else {
        console.log('✅ Function executed successfully');
      }
    } catch (error) {
      console.error('❌ Function test failed:', error.message);
    }

    // Test 3: Try to call the product function
    console.log('\n3. Testing product function...');
    
    try {
      const { data: productData, error: productError } = await supabase.rpc(
        'create_product_with_auth',
        {
          p_name: 'Test Product',
          p_description: 'Test description',
          p_dorm: 'Test Dorm',
          p_price: 100.00,
          p_seller_id: '00000000-0000-0000-0000-000000000000'
        }
      );

      if (productError) {
        if (productError.code === '42883') {
          console.error('❌ Function create_product_with_auth does not exist');
          console.log('   You need to run the SQL script: scripts/create-buy-order-function.sql');
        } else {
          console.log('✅ Function exists (expected auth error):', productError.message);
        }
      } else {
        console.log('✅ Function executed successfully');
      }
    } catch (error) {
      console.error('❌ Function test failed:', error.message);
    }

    // Test 4: Check RLS policies
    console.log('\n4. Checking RLS policies...');
    
    try {
      // Try to insert a test buy order (this will fail due to RLS, but shows the policy status)
      const { data: testInsert, error: insertError } = await supabase
        .from('buy_orders')
        .insert([{
          name: 'Test Buy Order',
          description: 'Test description',
          dorm: 'Test Dorm',
          user_id: '00000000-0000-0000-0000-000000000000',
          created_at: new Date().toISOString(),
          is_available: true,
          main_image_url: null,
          images: []
        }])
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '42501' && insertError.message.includes('row-level security policy')) {
          console.log('✅ RLS is enabled (expected policy violation)');
          console.log('   This means RLS policies need to be fixed');
        } else {
          console.log('⚠️  Insert error (not RLS):', insertError.message);
        }
      } else {
        console.log('⚠️  Insert succeeded (RLS might be disabled)');
      }
    } catch (error) {
      console.error('❌ RLS test failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
  }
}

// Run the test
testFunctions().then(() => {
  console.log('\n🏁 Function test completed');
  console.log('\n📋 Next Steps:');
  console.log('1. If functions don\'t exist, run: scripts/create-buy-order-function.sql');
  console.log('2. If RLS policies are blocking, run: scripts/fix-buy-orders-rls.sql');
  console.log('3. Check the README-database-setup.md for detailed instructions');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});


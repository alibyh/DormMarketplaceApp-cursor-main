-- Test script for product count functionality
-- This script helps verify that the product_count column is working correctly

SELECT '=== TESTING PRODUCT COUNT FUNCTIONALITY ===' as section;

-- 1. Check if product_count column exists
SELECT '=== CHECKING COLUMN EXISTENCE ===' as step;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name = 'product_count'
        ) THEN '✅ product_count column EXISTS'
        ELSE '❌ product_count column MISSING'
    END as column_status;

-- 2. Show current product counts for all users
SELECT '=== CURRENT PRODUCT COUNTS ===' as step;
SELECT 
    id,
    username,
    COALESCE(product_count, 0) as product_count,
    created_at
FROM profiles 
ORDER BY product_count DESC, created_at DESC;

-- 3. Show users with highest product counts
SELECT '=== TOP USERS BY PRODUCT COUNT ===' as step;
SELECT 
    username,
    COALESCE(product_count, 0) as product_count
FROM profiles 
WHERE product_count > 0
ORDER BY product_count DESC 
LIMIT 5;

-- 4. Show statistics
SELECT '=== STATISTICS ===' as step;
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN product_count > 0 THEN 1 END) as users_with_products,
    AVG(COALESCE(product_count, 0)) as avg_product_count,
    MAX(COALESCE(product_count, 0)) as max_product_count,
    SUM(COALESCE(product_count, 0)) as total_products_created
FROM profiles;

-- 5. Test manual increment (for testing purposes)
-- Uncomment the following lines to test manual increment:
-- SELECT '=== TESTING MANUAL INCREMENT ===' as step;
-- UPDATE profiles 
-- SET product_count = COALESCE(product_count, 0) + 1 
-- WHERE username = 'test_user' 
-- RETURNING username, product_count;

SELECT '=== PRODUCT COUNT TEST COMPLETED ===' as result;

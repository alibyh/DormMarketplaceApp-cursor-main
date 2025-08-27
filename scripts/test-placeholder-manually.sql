-- Simple script to manually test placeholder functionality
-- Run this step by step to test

-- Step 1: Check current state
SELECT '=== STEP 1: Current State ===' as step;
SELECT 
    'Products count:' as info,
    COUNT(*) as count
FROM products;

SELECT 
    'Conversations with products:' as info,
    COUNT(*) as count
FROM conversations 
WHERE product_id IS NOT NULL;

-- Step 2: Find a product to test with
SELECT '=== STEP 2: Find a product to test ===' as step;
SELECT 
    id,
    name,
    seller_id,
    is_deleted,
    created_at
FROM products 
ORDER BY created_at DESC 
LIMIT 3;

-- Step 3: Check if this product has conversations
SELECT '=== STEP 3: Check conversations for the first product ===' as step;
-- Replace 'your-product-id' with an actual product ID from step 2
SELECT 
    conversation_id,
    product_id,
    product_name,
    product_deleted,
    buyer_id,
    seller_id
FROM conversations 
WHERE product_id = 'your-product-id'  -- Replace with actual product ID
LIMIT 5;

-- Step 4: Manual test commands (uncomment and modify)
-- SELECT '=== STEP 4: Manual Test Commands ===' as step;
-- 
-- -- Replace 'your-product-id' with actual product ID
-- -- UPDATE products SET is_deleted = true WHERE id = 'your-product-id';
-- -- UPDATE conversations SET product_deleted = true WHERE product_id = 'your-product-id';
-- 
-- -- Check the result
-- -- SELECT 
-- --     p.id,
-- --     p.name,
-- --     p.is_deleted as product_is_deleted,
-- --     c.conversation_id,
-- --     c.product_deleted as conversation_product_deleted
-- -- FROM products p
-- -- LEFT JOIN conversations c ON p.id = c.product_id
-- -- WHERE p.id = 'your-product-id';

-- Step 5: Expected result
SELECT '=== STEP 5: Expected Result ===' as step;
SELECT 
    'After running the UPDATE commands:' as info,
    '1. Product should have is_deleted = true' as result1,
    '2. Conversation should have product_deleted = true' as result2,
    '3. App should show "Deleted Item" and placeholder image' as result3;

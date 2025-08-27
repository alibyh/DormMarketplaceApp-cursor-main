-- Debug script to identify why placeholders aren't showing
-- Run this in Supabase SQL Editor to check the current state

-- 1. Check if required columns exist
SELECT '=== CHECKING COLUMNS ===' as section;
SELECT 'products.is_deleted' as column_name, 
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_deleted') as exists
UNION ALL
SELECT 'buy_orders.is_deleted' as column_name,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buy_orders' AND column_name = 'is_deleted') as exists
UNION ALL
SELECT 'conversations.product_deleted' as column_name,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'product_deleted') as exists;

-- 2. Show current products and their deletion status
SELECT '=== CURRENT PRODUCTS ===' as section;
SELECT 
    id,
    name,
    seller_id,
    is_deleted,
    created_at
FROM products 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Show current conversations with product info
SELECT '=== CURRENT CONVERSATIONS ===' as section;
SELECT 
    c.conversation_id,
    c.product_id,
    c.product_name,
    c.product_type,
    c.product_deleted as conversation_product_deleted,
    CASE 
        WHEN c.product_type = 'buy_order' THEN bo.is_deleted
        WHEN c.product_type = 'sell' THEN p.is_deleted
        ELSE false
    END as product_is_deleted_in_source,
    c.buyer_id,
    c.seller_id,
    c.last_message_at
FROM conversations c
LEFT JOIN products p ON c.product_id = p.id AND c.product_type = 'sell'
LEFT JOIN buy_orders bo ON c.product_id = bo.id AND c.product_type = 'buy_order'
WHERE c.product_id IS NOT NULL
ORDER BY c.last_message_at DESC
LIMIT 5;

-- 4. Check for any deleted products
SELECT '=== DELETED PRODUCTS ===' as section;
SELECT 
    p.id,
    p.name,
    p.is_deleted,
    c.conversation_id,
    c.product_deleted as conversation_product_deleted
FROM products p
LEFT JOIN conversations c ON p.id = c.product_id
WHERE p.is_deleted = true
LIMIT 5;

-- 5. Check for conversations with product_deleted = true
SELECT '=== CONVERSATIONS WITH DELETED PRODUCTS ===' as section;
SELECT 
    c.conversation_id,
    c.product_id,
    c.product_name,
    c.product_deleted,
    p.is_deleted as product_is_deleted
FROM conversations c
LEFT JOIN products p ON c.product_id = p.id
WHERE c.product_deleted = true
LIMIT 5;

-- 6. Test data for manual testing
SELECT '=== TEST DATA FOR MANUAL TESTING ===' as section;
SELECT 
    'To test placeholders, run these commands:' as instruction,
    '1. Find a product ID from the products table above' as step1,
    '2. Mark it as deleted: UPDATE products SET is_deleted = true WHERE id = ''product-id''' as step2,
    '3. Update conversation: UPDATE conversations SET product_deleted = true WHERE product_id = ''product-id''' as step3,
    '4. Check the app - should show placeholders' as step4;

-- 7. Check if triggers exist
SELECT '=== CHECKING TRIGGERS ===' as section;
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%deletion%';

-- Quick check of current database state
-- Run this in Supabase SQL Editor

-- 1. Check if columns exist
SELECT '=== COLUMNS CHECK ===' as section;
SELECT 
    'products.is_deleted' as column_name,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_deleted') as exists
UNION ALL
SELECT 
    'conversations.product_deleted' as column_name,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'product_deleted') as exists;

-- 2. Check the specific product that should be deleted
SELECT '=== PRODUCT CHECK ===' as section;
SELECT 
    id,
    name,
    is_deleted,
    created_at
FROM products 
WHERE id = 'e22f4c35-4a89-4b28-a4fd-7e26ca90d222';

-- 3. Check the conversation for this product
SELECT '=== CONVERSATION CHECK ===' as section;
SELECT 
    conversation_id,
    product_id,
    product_name,
    product_deleted,
    buyer_id,
    seller_id
FROM conversations 
WHERE product_id = 'e22f4c35-4a89-4b28-a4fd-7e26ca90d222';

-- 4. Check if product exists at all
SELECT '=== PRODUCT EXISTS ===' as section;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM products WHERE id = 'e22f4c35-4a89-4b28-a4fd-7e26ca90d222') 
        THEN 'Product EXISTS in database'
        ELSE 'Product does NOT exist (was hard deleted)'
    END as status;

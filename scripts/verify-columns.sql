-- Verify if the database columns were actually added
-- Run this in Supabase SQL Editor

-- 1. Check if columns exist
SELECT '=== COLUMNS VERIFICATION ===' as section;
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('products', 'buy_orders', 'conversations')
AND column_name IN ('is_deleted', 'product_deleted')
ORDER BY table_name, column_name;

-- 2. Check current products and their deletion status
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

-- 3. Check current conversations and their product deletion status
SELECT '=== CURRENT CONVERSATIONS ===' as section;
SELECT 
    conversation_id,
    product_id,
    product_name,
    product_deleted,
    buyer_id,
    seller_id
FROM conversations 
WHERE product_id IS NOT NULL
ORDER BY last_message_at DESC 
LIMIT 5;

-- 4. Check if triggers exist
SELECT '=== TRIGGERS VERIFICATION ===' as section;
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%deletion%';

-- 5. Test instructions
SELECT '=== TEST INSTRUCTIONS ===' as section;
SELECT 
    '1. If columns exist, try deleting a product through the app' as step1,
    '2. Check console logs for debug messages from deleteProduct function' as step2,
    '3. Check if product gets soft deleted (is_deleted = true)' as step3,
    '4. Check if conversation gets updated (product_deleted = true)' as step4;

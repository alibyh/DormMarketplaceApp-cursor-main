-- Test script for product deletion handling
-- Run this in Supabase SQL Editor to test the functionality

-- 1. Check if the required columns exist
SELECT 'Checking database structure...' as step;

SELECT 'buy_orders.is_deleted exists:' as check_column, 
       EXISTS (
           SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'buy_orders' 
           AND column_name = 'is_deleted'
       ) as exists;

SELECT 'conversations.product_deleted exists:' as check_column,
       EXISTS (
           SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'conversations' 
           AND column_name = 'product_deleted'
       ) as exists;

-- 2. Check if triggers exist
SELECT 'Checking triggers...' as step;

SELECT 'product_deletion_trigger exists:' as check_trigger,
       EXISTS (
           SELECT 1 FROM information_schema.triggers 
           WHERE trigger_name = 'product_deletion_trigger'
           AND event_object_table = 'products'
       ) as exists;

SELECT 'buy_order_deletion_trigger exists:' as check_trigger,
       EXISTS (
           SELECT 1 FROM information_schema.triggers 
           WHERE trigger_name = 'buy_order_deletion_trigger'
           AND event_object_table = 'buy_orders'
       ) as exists;

-- 3. Show current conversations with products
SELECT 'Current conversations with products:' as step;
SELECT 
    c.conversation_id,
    c.product_id,
    c.product_name,
    c.product_deleted,
    c.product_type,
    CASE 
        WHEN c.product_type = 'buy_order' THEN COALESCE(bo.is_deleted, false)
        WHEN c.product_type = 'sell' THEN COALESCE(p.is_deleted, false)
        ELSE false
    END as product_is_deleted_in_source
FROM conversations c
LEFT JOIN products p ON c.product_id = p.id AND c.product_type = 'sell'
LEFT JOIN buy_orders bo ON c.product_id = bo.id AND c.product_type = 'buy_order'
WHERE c.product_id IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 10;

-- 4. Test function to mark product as deleted
SELECT 'Testing mark_product_deleted_in_conversations function...' as step;

-- This will only work if you have a valid product_id
-- Replace 'test-product-id' with an actual product ID from your database
-- SELECT mark_product_deleted_in_conversations('test-product-id');

-- 5. Show sample data for testing
SELECT 'Sample products for testing:' as step;
SELECT id, name, is_deleted FROM products WHERE is_deleted = false LIMIT 5;

SELECT 'Sample buy orders for testing:' as step;
SELECT id, name, is_deleted FROM buy_orders WHERE is_deleted = false LIMIT 5;

-- 6. Instructions for manual testing
SELECT 'Manual Testing Instructions:' as step;
SELECT 
    '1. Pick a product ID from above' as instruction,
    '2. Run: UPDATE products SET is_deleted = true WHERE id = ''product-id''' as sql_command,
    '3. Check if conversation.product_deleted was updated automatically' as verification;

SELECT 
    '1. Pick a buy order ID from above' as instruction,
    '2. Run: UPDATE buy_orders SET is_deleted = true WHERE id = ''buy-order-id''' as sql_command,
    '3. Check if conversation.product_deleted was updated automatically' as verification;

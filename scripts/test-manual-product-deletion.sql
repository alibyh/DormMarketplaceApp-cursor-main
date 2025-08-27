-- Test script for manual product deletion handling
-- This script helps test the complete flow from product deletion to placeholder display

-- 1. Check if all required columns exist
SELECT 'Checking required columns:' as step;
SELECT 'products.is_deleted' as column_name, 
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_deleted') as exists
UNION ALL
SELECT 'buy_orders.is_deleted' as column_name,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buy_orders' AND column_name = 'is_deleted') as exists
UNION ALL
SELECT 'conversations.product_deleted' as column_name,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'product_deleted') as exists;

-- 2. Show current products and their deletion status
SELECT 'Current products:' as step;
SELECT 
    id,
    name,
    seller_id,
    is_deleted,
    created_at
FROM products 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Show current conversations with product info
SELECT 'Current conversations with product info:' as step;
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
LIMIT 10;

-- 4. Manual test instructions
SELECT 'Manual test instructions:' as step;
SELECT 
    '1. Find a product ID from the products table above' as step1,
    '2. Mark it as deleted using: UPDATE products SET is_deleted = true WHERE id = ''product-id''' as step2,
    '3. Check if conversations were updated automatically' as step3,
    '4. Test the app - should show placeholders' as step4;

-- 5. Test product deletion (replace 'your-product-id' with actual ID)
-- Uncomment and modify the lines below to test:

-- -- Mark a product as deleted
-- UPDATE products SET is_deleted = true WHERE id = 'your-product-id';
-- 
-- -- Check if conversations were updated
-- SELECT 
--     c.conversation_id,
--     c.product_id,
--     c.product_name,
--     c.product_deleted,
--     p.is_deleted as product_is_deleted
-- FROM conversations c
-- LEFT JOIN products p ON c.product_id = p.id
-- WHERE c.product_id = 'your-product-id';

-- 6. Expected behavior after deletion
SELECT 'Expected behavior after product deletion:' as step;
SELECT 
    'Conversations screen:' as screen,
    'Show "Deleted Item" as product name' as product_name,
    'Show deleted_product_placeholder.webp as image' as product_image
UNION ALL
SELECT 
    'Chat screen:' as screen,
    'Show "Deleted Item" as product name' as product_name,
    'Show deleted_product_placeholder.webp as image' as product_image;

-- 7. Troubleshooting queries
SELECT 'Troubleshooting queries:' as step;
SELECT 
    'Check for orphaned conversations:' as query1,
    'SELECT * FROM conversations WHERE product_id NOT IN (SELECT id FROM products WHERE is_deleted = false)' as sql1
UNION ALL
SELECT 
    'Check for inconsistent deletion status:' as query2,
    'SELECT c.product_id, c.product_deleted, p.is_deleted FROM conversations c LEFT JOIN products p ON c.product_id = p.id WHERE c.product_deleted != p.is_deleted' as sql2;

-- Test script to verify placeholder display functionality
-- This script helps test if deleted products and users show placeholders correctly

-- 1. Check if required columns exist
SELECT 'Checking required columns:' as step;
SELECT 'products.is_deleted' as column_name, 
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_deleted') as exists
UNION ALL
SELECT 'buy_orders.is_deleted' as column_name,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buy_orders' AND column_name = 'is_deleted') as exists
UNION ALL
SELECT 'conversations.product_deleted' as column_name,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'product_deleted') as exists;

-- 2. Show current conversations with product info
SELECT 'Current conversations with product info:' as step;
SELECT 
    c.conversation_id,
    c.product_id,
    c.product_name,
    c.product_type,
    CASE 
        WHEN c.product_type = 'buy_order' THEN bo.is_deleted
        WHEN c.product_type = 'sell' THEN p.is_deleted
        ELSE false
    END as product_is_deleted,
    c.product_deleted as conversation_product_deleted,
    c.buyer_id,
    c.seller_id
FROM conversations c
LEFT JOIN products p ON c.product_id = p.id AND c.product_type = 'sell'
LEFT JOIN buy_orders bo ON c.product_id = bo.id AND c.product_type = 'buy_order'
WHERE c.product_id IS NOT NULL
ORDER BY c.last_message_at DESC
LIMIT 10;

-- 3. Test manual product deletion (for testing purposes)
-- Uncomment the lines below to test product deletion manually:

-- -- Mark a product as deleted (replace 'product-id-here' with actual product ID)
-- UPDATE products SET is_deleted = true WHERE id = 'product-id-here';
-- 
-- -- Mark a buy order as deleted (replace 'buy-order-id-here' with actual buy order ID)
-- UPDATE buy_orders SET is_deleted = true WHERE id = 'buy-order-id-here';
-- 
-- -- Update conversation to mark product as deleted
-- UPDATE conversations SET product_deleted = true WHERE product_id = 'product-id-here';

-- 4. Show what should happen in the UI
SELECT 'Expected UI behavior:' as step;
SELECT 
    'For deleted products:' as scenario,
    'Show "Deleted Item" as product name' as product_name,
    'Show deleted_product_placeholder.webp as image' as product_image,
    'Show "Deleted Account" for deleted users' as user_name,
    'Show deleted_user_placeholder.png for user avatars' as user_avatar;

-- 5. Instructions for testing
SELECT 'Testing instructions:' as step;
SELECT 
    '1. Run the database fix script first' as step1,
    '2. Mark a product as deleted using the UPDATE commands above' as step2,
    '3. Check the conversations screen - should show "Deleted Item"' as step3,
    '4. Open the chat - should show placeholder images' as step4,
    '5. Verify deleted users show "Deleted Account"' as step5;

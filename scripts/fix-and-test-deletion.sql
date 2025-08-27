-- Fix and test product deletion properly
-- This script will add missing columns and help test the deletion process

-- 1. Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add is_deleted to products table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE products ADD COLUMN is_deleted BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_deleted column to products table';
    END IF;
    
    -- Add is_deleted to buy_orders table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'buy_orders' 
        AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE buy_orders ADD COLUMN is_deleted BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_deleted column to buy_orders table';
    END IF;
    
    -- Add product_deleted to conversations table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' 
        AND column_name = 'product_deleted'
    ) THEN
        ALTER TABLE conversations ADD COLUMN product_deleted BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added product_deleted column to conversations table';
    END IF;
END $$;

-- 2. Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION handle_product_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- When a product is marked as deleted, update all conversations
    IF NEW.is_deleted = true AND (OLD.is_deleted = false OR OLD.is_deleted IS NULL) THEN
        UPDATE conversations 
        SET product_deleted = true 
        WHERE product_id = NEW.id;
        
        RAISE NOTICE 'Updated conversations for deleted product: %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create triggers if they don't exist
DROP TRIGGER IF EXISTS product_deletion_trigger ON products;
CREATE TRIGGER product_deletion_trigger
    AFTER UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION handle_product_deletion();

DROP TRIGGER IF EXISTS buy_order_deletion_trigger ON buy_orders;
CREATE TRIGGER buy_order_deletion_trigger
    AFTER UPDATE ON buy_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_product_deletion();

-- 4. Verify columns exist
SELECT '=== VERIFYING COLUMNS ===' as section;
SELECT 'products.is_deleted' as column_name, 
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_deleted') as exists
UNION ALL
SELECT 'buy_orders.is_deleted' as column_name,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buy_orders' AND column_name = 'is_deleted') as exists
UNION ALL
SELECT 'conversations.product_deleted' as column_name,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'product_deleted') as exists;

-- 5. Show current products for testing
SELECT '=== CURRENT PRODUCTS FOR TESTING ===' as section;
SELECT 
    id,
    name,
    seller_id,
    is_deleted,
    created_at
FROM products 
ORDER BY created_at DESC 
LIMIT 5;

-- 6. Show current conversations
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

-- 7. Test instructions
SELECT '=== TEST INSTRUCTIONS ===' as section;
SELECT 
    '1. Find a product ID from the products table above' as step1,
    '2. Delete the product through the app (using delete button)' as step2,
    '3. Check if product is soft deleted (is_deleted = true)' as step3,
    '4. Check if conversation is updated (product_deleted = true)' as step4,
    '5. Check the app - should show placeholders' as step5;

-- 8. Manual test commands (uncomment and modify to test)
-- SELECT '=== MANUAL TEST COMMANDS ===' as section;
-- 
-- -- Replace 'your-product-id' with actual product ID from step 5
-- -- UPDATE products SET is_deleted = true WHERE id = 'your-product-id';
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

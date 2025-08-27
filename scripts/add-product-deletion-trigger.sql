-- Add trigger to automatically update conversations when products are deleted
-- This ensures that when a product is marked as deleted, conversations are updated

-- 1. First, ensure the product_deleted column exists in conversations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' 
        AND column_name = 'product_deleted'
    ) THEN
        ALTER TABLE conversations ADD COLUMN product_deleted BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added product_deleted column to conversations table';
    END IF;
END $$;

-- 2. Create function to handle product deletion
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

-- 3. Create trigger for products table
DROP TRIGGER IF EXISTS product_deletion_trigger ON products;
CREATE TRIGGER product_deletion_trigger
    AFTER UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION handle_product_deletion();

-- 4. Create trigger for buy_orders table
DROP TRIGGER IF EXISTS buy_order_deletion_trigger ON buy_orders;
CREATE TRIGGER buy_order_deletion_trigger
    AFTER UPDATE ON buy_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_product_deletion();

-- 5. Verify the triggers were created
SELECT 
    'Triggers created successfully' as status,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name IN ('product_deletion_trigger', 'buy_order_deletion_trigger');

-- 6. Test the trigger (optional - uncomment to test)
-- UPDATE products SET is_deleted = true WHERE id = 'test-product-id';
-- SELECT product_id, product_deleted FROM conversations WHERE product_id = 'test-product-id';

-- Add product deletion tracking to buy_orders table
-- This script adds the is_deleted field to buy_orders table and updates conversations to track product deletion

-- Add is_deleted field to buy_orders table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'buy_orders' 
        AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE buy_orders ADD COLUMN is_deleted BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_deleted column to buy_orders table';
    ELSE
        RAISE NOTICE 'is_deleted column already exists in buy_orders table';
    END IF;
END $$;

-- Add product_deleted field to conversations table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' 
        AND column_name = 'product_deleted'
    ) THEN
        ALTER TABLE conversations ADD COLUMN product_deleted BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added product_deleted column to conversations table';
    ELSE
        RAISE NOTICE 'product_deleted column already exists in conversations table';
    END IF;
END $$;

-- Create function to mark product as deleted in conversations
CREATE OR REPLACE FUNCTION mark_product_deleted_in_conversations(product_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE conversations 
    SET product_deleted = true 
    WHERE product_id = $1;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error marking product as deleted in conversations: %', SQLERRM; 
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically mark conversations when product is deleted
CREATE OR REPLACE FUNCTION handle_product_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- If product is being marked as deleted
    IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
        -- Mark conversations as having deleted product
        PERFORM mark_product_deleted_in_conversations(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for products table
DROP TRIGGER IF EXISTS product_deletion_trigger ON products;
CREATE TRIGGER product_deletion_trigger
    AFTER UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION handle_product_deletion();

-- Create trigger for buy_orders table
DROP TRIGGER IF EXISTS buy_order_deletion_trigger ON buy_orders;
CREATE TRIGGER buy_order_deletion_trigger
    AFTER UPDATE ON buy_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_product_deletion();

-- Update RLS policies to include deleted products in conversations
-- This allows users to still see conversations even if the product was deleted
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
CREATE POLICY "Users can view their own conversations" 
    ON conversations 
    FOR SELECT 
    USING (auth.uid() = ANY(participant_ids));

-- Verify the changes
SELECT 'Migration completed successfully' as status;
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

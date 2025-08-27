-- Quick fix for database issues
-- Run this in Supabase SQL Editor to fix the missing columns

-- 1. Add is_deleted to products table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE products ADD COLUMN is_deleted BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_deleted to products table';
    END IF;
END $$;

-- 2. Add is_deleted to buy_orders table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'buy_orders' 
        AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE buy_orders ADD COLUMN is_deleted BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_deleted to buy_orders table';
    END IF;
END $$;

-- 3. Add product_deleted to conversations table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' 
        AND column_name = 'product_deleted'
    ) THEN
        ALTER TABLE conversations ADD COLUMN product_deleted BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added product_deleted to conversations table';
    END IF;
END $$;

-- 4. Verify all columns exist
SELECT 'Verification:' as step;
SELECT 'products.is_deleted' as column_name, 
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_deleted') as exists
UNION ALL
SELECT 'buy_orders.is_deleted' as column_name,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buy_orders' AND column_name = 'is_deleted') as exists
UNION ALL
SELECT 'conversations.product_deleted' as column_name,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'product_deleted') as exists;

-- 5. Show success message
SELECT 'Database fix completed successfully!' as status;

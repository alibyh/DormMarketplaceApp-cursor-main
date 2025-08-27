-- Fix products table by adding missing is_deleted column
-- This script adds the is_deleted field to products table if it doesn't exist

-- Add is_deleted field to products table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE products ADD COLUMN is_deleted BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_deleted column to products table';
    ELSE
        RAISE NOTICE 'is_deleted column already exists in products table';
    END IF;
END $$;

-- Verify the column was added
SELECT 'products.is_deleted exists:' as check_column, 
       EXISTS (
           SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'products' 
           AND column_name = 'is_deleted'
       ) as exists;

-- Show current products table structure
SELECT 'Current products table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;

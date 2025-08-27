-- Add product_count column to profiles table
-- This column will track how many products/buy orders a user has created/edited

SELECT '=== ADDING PRODUCT_COUNT COLUMN ===' as section;

-- 1. Add product_count column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'product_count'
    ) THEN
        ALTER TABLE profiles ADD COLUMN product_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added product_count column to profiles table';
    ELSE
        RAISE NOTICE 'product_count column already exists in profiles table';
    END IF;
END $$;

-- 2. Create index for better performance (optional)
CREATE INDEX IF NOT EXISTS idx_profiles_product_count ON profiles(product_count);

-- 3. Verify the column was added
SELECT '=== VERIFICATION ===' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'product_count';

-- 4. Show current product counts for existing users
SELECT '=== CURRENT PRODUCT COUNTS ===' as section;
SELECT 
    id,
    username,
    COALESCE(product_count, 0) as product_count
FROM profiles 
ORDER BY product_count DESC 
LIMIT 10;

SELECT '=== PRODUCT_COUNT COLUMN ADDED SUCCESSFULLY ===' as result;

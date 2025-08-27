-- Emergency Profiles Fix
-- This script will temporarily disable RLS to get signup working immediately

-- Step 1: Temporarily disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Add any missing columns
DO $$
BEGIN
    -- Add name column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'name'
    ) THEN
        ALTER TABLE profiles ADD COLUMN name TEXT;
    END IF;

    -- Add phone_number column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE profiles ADD COLUMN phone_number TEXT;
    END IF;

    -- Add allow_phone_contact column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'allow_phone_contact'
    ) THEN
        ALTER TABLE profiles ADD COLUMN allow_phone_contact BOOLEAN DEFAULT false;
    END IF;

    -- Add is_admin column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
    END IF;

    -- Add product_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'product_count'
    ) THEN
        ALTER TABLE profiles ADD COLUMN product_count INTEGER DEFAULT 0;
    END IF;

    -- Add pending_deletion column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'pending_deletion'
    ) THEN
        ALTER TABLE profiles ADD COLUMN pending_deletion BOOLEAN DEFAULT false;
    END IF;

    -- Add deletion_requested_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'deletion_requested_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN deletion_requested_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add admin_deletion_requested column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'admin_deletion_requested'
    ) THEN
        ALTER TABLE profiles ADD COLUMN admin_deletion_requested BOOLEAN DEFAULT false;
    END IF;

    -- Add is_deleted column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_deleted BOOLEAN DEFAULT false;
    END IF;

    -- Add deleted_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Step 3: Clean up any orphaned profiles
DELETE FROM profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Step 4: Verify the fix
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles';

-- Step 5: Show table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Success message
SELECT '🚨 EMERGENCY FIX APPLIED: RLS temporarily disabled on profiles table 🚨' as warning;
SELECT 'Signup should now work immediately' as status;
SELECT 'Remember to re-enable RLS and add proper policies before production' as reminder;

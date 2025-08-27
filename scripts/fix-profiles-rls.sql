-- Fix Row Level Security policies for profiles table
-- This script will ensure users can create their own profile during signup

-- First, let's check the current RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Add missing columns to profiles table if they don't exist
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

-- Enable RLS on profiles table if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create new policies

-- Policy 1: Allow all users to view all profiles (for browsing)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Policy 2: Allow authenticated users to insert their own profile (for signup)
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy 3: Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd;

-- Show the current table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Success message
SELECT 'Profiles RLS policies updated successfully!' as status;
SELECT 'Users can now create their own profile during signup' as note;
SELECT 'All necessary columns have been added to the profiles table' as columns_added;

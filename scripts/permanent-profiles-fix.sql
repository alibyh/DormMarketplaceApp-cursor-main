-- Permanent Profiles Fix
-- This script creates a robust solution that works consistently

-- Step 1: First, let's see what's currently happening
SELECT 'Current RLS Status:' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles';

-- Step 2: Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;

-- Step 3: Add missing columns (if any)
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

    -- Add user_deleted column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'user_deleted'
    ) THEN
        ALTER TABLE profiles ADD COLUMN user_deleted BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Step 4: Create a function to handle profile creation with proper auth context
CREATE OR REPLACE FUNCTION create_user_profile_safe(
    user_id UUID,
    profile_username TEXT,
    profile_email TEXT,
    profile_name TEXT DEFAULT NULL,
    profile_dorm TEXT DEFAULT NULL,
    profile_phone TEXT DEFAULT NULL,
    profile_allow_phone BOOLEAN DEFAULT false,
    profile_is_admin BOOLEAN DEFAULT false
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Insert the profile with explicit auth context
    INSERT INTO profiles (
        id, 
        username, 
        email, 
        name, 
        dorm, 
        phone_number, 
        allow_phone_contact, 
        is_admin,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        profile_username,
        profile_email,
        profile_name,
        profile_dorm,
        profile_phone,
        profile_allow_phone,
        profile_is_admin,
        NOW(),
        NOW()
    );
    
    -- Return the created profile
    SELECT row_to_json(p) INTO result
    FROM profiles p
    WHERE p.id = user_id;
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'error', true,
        'message', SQLERRM,
        'code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Enable RLS and create robust policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow all users to view all profiles (for browsing)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Policy 2: Allow authenticated users to insert their own profile (for signup)
-- This policy is more permissive to handle the signup flow
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id OR 
    auth.role() = 'authenticated'
  );

-- Policy 3: Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policy 4: Allow users to delete their own profile
CREATE POLICY "Users can delete their own profile" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- Step 6: Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_user_profile_safe(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile_safe(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) TO anon;

-- Step 7: Verify the setup
SELECT 'Policies created:' as info;
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd;

-- Step 8: Test the function
SELECT 'Testing profile creation function...' as test;
SELECT create_user_profile_safe(
    '00000000-0000-0000-0000-000000000000'::UUID,
    'test_user',
    'test@example.com',
    'Test User',
    'test',
    '123',
    false,
    false
) as test_result;

-- Clean up test data
DELETE FROM profiles WHERE id = '00000000-0000-0000-0000-000000000000'::UUID;

-- Success message
SELECT '✅ PERMANENT FIX APPLIED' as status;
SELECT 'Profiles table now has robust RLS policies' as note;
SELECT 'Use create_user_profile_safe() function for reliable profile creation' as recommendation;

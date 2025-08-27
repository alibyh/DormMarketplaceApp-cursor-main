-- Check Profiles RLS Status
-- This script will show you the current state of RLS policies on the profiles table

-- Check if RLS is enabled on profiles table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles';

-- Check all existing policies on profiles table
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

-- Check if the INSERT policy exists specifically
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles' AND cmd = 'INSERT';

-- Check the current user context
SELECT 
  current_user as current_user,
  session_user as session_user,
  auth.uid() as auth_uid,
  auth.role() as auth_role;

-- Check if the profiles table has all required columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Test if we can insert a profile manually (this will help identify the issue)
-- Note: This will fail if RLS is blocking it, which is what we want to see
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000000'::UUID;
    insert_result RECORD;
BEGIN
    -- Try to insert a test profile
    INSERT INTO profiles (id, username, email, name, dorm, phone_number, allow_phone_contact, is_admin)
    VALUES (test_user_id, 'test_user', 'test@example.com', 'Test User', 'test', '123', false, false)
    RETURNING * INTO insert_result;
    
    RAISE NOTICE 'Test insert successful: %', insert_result;
    
    -- Clean up the test insert
    DELETE FROM profiles WHERE id = test_user_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test insert failed with error: %', SQLERRM;
END $$;

-- Show any recent errors in the logs (if available)
SELECT 'RLS Status Check Complete' as status;

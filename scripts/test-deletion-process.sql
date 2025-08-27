-- Test script to verify the deletion process works correctly
-- Run this in Supabase SQL Editor to test the deletion process

-- Step 1: Check if the preparation function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'prepare_account_for_auth_deletion';

-- Step 2: Check if the required columns exist
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('messages', 'conversations', 'profiles')
  AND column_name IN ('sender_deleted', 'buyer_deleted', 'seller_deleted', 'user_deleted')
ORDER BY table_name, column_name;

-- Step 3: Check for users pending deletion (replace with actual user ID for testing)
-- SELECT * FROM profiles WHERE pending_deletion = TRUE;

-- Step 4: Test the preparation function (replace 'test-user-id' with actual user ID)
-- SELECT prepare_account_for_auth_deletion('test-user-id');

-- Step 5: Verify the user can be deleted from auth.users
-- DELETE FROM auth.users WHERE id = 'test-user-id';

-- Note: Replace 'test-user-id' with an actual user ID when testing

-- Fix Email Validation Issues in Supabase
-- This script helps troubleshoot and fix email validation problems

-- First, let's check if the email already exists
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'godfriedtossou04@gmail.com';

-- Check if there are any users with similar emails
SELECT 
  id,
  email,
  created_at
FROM auth.users 
WHERE email LIKE '%godfriedtossou04%';

-- Check the current auth settings
SELECT 
  name,
  value
FROM auth.config 
WHERE name IN (
  'enable_signup',
  'enable_confirmations',
  'double_confirm_changes',
  'secure_password_change'
);

-- Check if there are any rate limiting issues
SELECT 
  name,
  value
FROM auth.config 
WHERE name LIKE '%rate_limit%' OR name LIKE '%frequency%';

-- Check for any email-related settings
SELECT 
  name,
  value
FROM auth.config 
WHERE name LIKE '%email%';

-- If the user exists but is not confirmed, you can manually confirm them:
-- UPDATE auth.users 
-- SET email_confirmed_at = NOW() 
-- WHERE email = 'godfriedtossou04@gmail.com';

-- If you want to delete the existing user to allow re-registration:
-- DELETE FROM auth.users WHERE email = 'godfriedtossou04@gmail.com';

-- Check for any profiles that might be orphaned
SELECT 
  p.id,
  p.email,
  p.username,
  p.created_at
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

-- Show current auth configuration summary
SELECT 'Current Auth Configuration:' as info;
SELECT 
  'enable_signup' as setting,
  (SELECT value FROM auth.config WHERE name = 'enable_signup') as value
UNION ALL
SELECT 
  'enable_confirmations' as setting,
  (SELECT value FROM auth.config WHERE name = 'enable_confirmations') as value
UNION ALL
SELECT 
  'double_confirm_changes' as setting,
  (SELECT value FROM auth.config WHERE name = 'double_confirm_changes') as value;

-- Success message
SELECT 'Email validation check completed!' as status;
SELECT 'Check the results above to identify the issue' as note;

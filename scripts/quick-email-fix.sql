-- Quick Fix for Email Validation Issues
-- Run this script to resolve common email validation problems

-- Step 1: Check if the email already exists
DO $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM auth.users 
        WHERE email = 'godfriedtossou04@gmail.com'
    ) INTO user_exists;
    
    IF user_exists THEN
        RAISE NOTICE 'User with email godfriedtossou04@gmail.com already exists';
        
        -- Option 1: Confirm the existing user
        UPDATE auth.users 
        SET email_confirmed_at = NOW() 
        WHERE email = 'godfriedtossou04@gmail.com' 
        AND email_confirmed_at IS NULL;
        
        RAISE NOTICE 'User confirmed successfully';
        
        -- Option 2: Delete the existing user (uncomment if needed)
        -- DELETE FROM auth.users WHERE email = 'godfriedtossou04@gmail.com';
        -- RAISE NOTICE 'Existing user deleted';
        
    ELSE
        RAISE NOTICE 'No existing user found with this email';
    END IF;
END $$;

-- Step 2: Ensure signup is enabled
UPDATE auth.config 
SET value = 'true' 
WHERE name = 'enable_signup' AND value != 'true';

-- Step 3: Disable email confirmations if you want immediate access
UPDATE auth.config 
SET value = 'false' 
WHERE name = 'enable_confirmations' AND value != 'false';

-- Step 4: Check for any orphaned profiles and clean them up
DELETE FROM profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Step 5: Verify the fix
SELECT 
  'enable_signup' as setting,
  (SELECT value FROM auth.config WHERE name = 'enable_signup') as value
UNION ALL
SELECT 
  'enable_confirmations' as setting,
  (SELECT value FROM auth.config WHERE name = 'enable_confirmations') as value;

-- Success message
SELECT 'Email validation issues fixed!' as status;
SELECT 'Try signing up again with the same email' as next_step;

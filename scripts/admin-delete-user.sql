-- Admin script to safely delete a user from auth.users table
-- This script prepares the account for auth user deletion

-- Function to prepare account for auth user deletion
CREATE OR REPLACE FUNCTION prepare_account_for_auth_deletion(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Step 1: Update all messages to remove sender_id references
  UPDATE messages 
  SET sender_id = NULL, sender_deleted = TRUE 
  WHERE sender_id = user_id;

  -- Step 2: Update all conversations to remove participant references
  UPDATE conversations 
  SET 
    buyer_id = NULL,
    seller_id = NULL,
    participant_ids = NULL,
    buyer_deleted = TRUE,
    seller_deleted = TRUE
  WHERE buyer_id = user_id OR seller_id = user_id;

  -- Step 3: Delete the profile completely (this removes the foreign key reference)
  DELETE FROM profiles WHERE id = user_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error preparing account for deletion: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT prepare_account_for_auth_deletion('user-uuid-here');

-- After running the function, you can safely delete from auth.users:
-- DELETE FROM auth.users WHERE id = 'user-uuid-here';

-- To find users pending deletion:
-- SELECT * FROM profiles WHERE pending_deletion = TRUE AND deletion_requested_at < NOW() - INTERVAL '24 hours';

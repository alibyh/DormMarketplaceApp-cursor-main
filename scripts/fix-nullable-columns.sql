-- Quick fix to make user1_id and user2_id nullable
-- Run this in your Supabase SQL Editor

-- Make user1_id and user2_id nullable to support product-centric structure
ALTER TABLE conversations ALTER COLUMN user1_id DROP NOT NULL;
ALTER TABLE conversations ALTER COLUMN user2_id DROP NOT NULL;

-- Success message
SELECT 'Columns made nullable successfully!' as status;

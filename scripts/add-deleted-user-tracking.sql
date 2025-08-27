-- Add columns for tracking deleted users
-- This script adds the necessary columns to handle deleted user references

-- Add columns to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS sender_deleted BOOLEAN DEFAULT FALSE;

-- Add columns to conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS buyer_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS seller_deleted BOOLEAN DEFAULT FALSE;

-- Add column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS user_deleted BOOLEAN DEFAULT FALSE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_deleted ON messages(sender_deleted);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_deleted ON conversations(buyer_deleted);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_deleted ON conversations(seller_deleted);
CREATE INDEX IF NOT EXISTS idx_profiles_user_deleted ON profiles(user_deleted);

-- Grant necessary permissions
GRANT SELECT, UPDATE ON messages TO authenticated;
GRANT SELECT, UPDATE ON conversations TO authenticated;
GRANT SELECT, UPDATE ON profiles TO authenticated;

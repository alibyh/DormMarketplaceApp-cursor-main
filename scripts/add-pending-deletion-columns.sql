-- Add columns for pending account deletion functionality
-- This script adds the necessary columns to handle pending account deletions

-- Add pending_deletion column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS pending_deletion BOOLEAN DEFAULT FALSE;

-- Add deletion_requested_at column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE;

-- Add admin_deletion_requested column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS admin_deletion_requested BOOLEAN DEFAULT FALSE;

-- Add index for better performance when querying pending deletions
CREATE INDEX IF NOT EXISTS idx_profiles_pending_deletion ON profiles(pending_deletion);

-- Add index for deletion_requested_at column
CREATE INDEX IF NOT EXISTS idx_profiles_deletion_requested_at ON profiles(deletion_requested_at);

-- Enable RLS on profiles table if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;

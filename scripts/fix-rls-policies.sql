-- Quick fix for RLS policies on conversations table
-- Run this in your Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations they're part of" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations they're part of" ON conversations;
DROP POLICY IF EXISTS "Users can delete conversations they're part of" ON conversations;

-- Create new policies that work with both participant_ids array and legacy user1_id/user2_id
CREATE POLICY "Users can view their own conversations" 
  ON conversations 
  FOR SELECT 
  USING (
    auth.uid() = ANY(participant_ids) OR 
    auth.uid() = user1_id OR 
    auth.uid() = user2_id
  );

CREATE POLICY "Users can create conversations they're part of" 
  ON conversations 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = ANY(participant_ids) OR 
    auth.uid() = user1_id OR 
    auth.uid() = user2_id
  );

CREATE POLICY "Users can update conversations they're part of" 
  ON conversations 
  FOR UPDATE 
  USING (
    auth.uid() = ANY(participant_ids) OR 
    auth.uid() = user1_id OR 
    auth.uid() = user2_id
  );

CREATE POLICY "Users can delete conversations they're part of" 
  ON conversations 
  FOR DELETE 
  USING (
    auth.uid() = ANY(participant_ids) OR 
    auth.uid() = user1_id OR 
    auth.uid() = user2_id
  );

-- Success message
SELECT 'RLS policies updated successfully!' as status;

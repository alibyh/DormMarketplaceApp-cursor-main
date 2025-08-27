-- Migration script to enable product-centric conversations
-- Run this in your Supabase SQL Editor

-- Add new columns to conversations table for product-centric conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS product_id UUID,
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS product_image TEXT,
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'product',
ADD COLUMN IF NOT EXISTS product_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS product_dorm TEXT,
ADD COLUMN IF NOT EXISTS buyer_id UUID,
ADD COLUMN IF NOT EXISTS seller_id UUID,
ADD COLUMN IF NOT EXISTS participant_ids UUID[] DEFAULT '{}';

-- Make user1_id and user2_id nullable to support product-centric structure
ALTER TABLE conversations ALTER COLUMN user1_id DROP NOT NULL;
ALTER TABLE conversations ALTER COLUMN user2_id DROP NOT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_product_id ON conversations(product_id);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_ids ON conversations USING GIN(participant_ids);

-- Update RLS policies to work with new product-centric structure
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
SELECT 'Migration completed successfully! Your conversations table now supports product-centric conversations.' as status;

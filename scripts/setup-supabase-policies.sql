-- EMERGENCY SQL SCRIPT TO FIX MESSAGING SYSTEM
-- This script will:
-- 1. Disable Row Level Security
-- 2. Drop all policies that might be causing issues
-- 3. Validate and fix database structure
-- 4. Empty all tables and start with clean slate (uncomment these lines to use)

-- ==============================================================
-- STEP 1: DISABLE RLS ON ALL MESSAGING TABLES
-- ==============================================================

-- Completely disable RLS on messaging tables
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- ==============================================================
-- STEP 2: CHECK DATABASE STRUCTURE AND FIX IT IF NEEDED
-- ==============================================================

-- First check table structure
SELECT 
  table_name, 
  column_name, 
  data_type,
  is_nullable
FROM 
  information_schema.columns 
WHERE 
  table_name IN ('conversations', 'messages')
ORDER BY 
  table_name, ordinal_position;

-- Make sure the conversations table has the correct structure
-- If the table doesn't exist, create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables 
                WHERE table_name = 'conversations') THEN
    CREATE TABLE conversations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      conversation_id TEXT UNIQUE NOT NULL,
      participant_ids UUID[] NOT NULL,
      last_message TEXT,
      last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END $$;

-- Ensure participant_ids is an array of UUIDs
DO $$
BEGIN
  ALTER TABLE conversations 
  ALTER COLUMN participant_ids TYPE UUID[] USING participant_ids::UUID[];
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not convert participant_ids to UUID array. Error: %', SQLERRM;
END $$;

-- Make sure the messages table has the correct structure
-- If the table doesn't exist, create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables 
                WHERE table_name = 'messages') THEN
    CREATE TABLE messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      conversation_id TEXT NOT NULL REFERENCES conversations(conversation_id),
      sender_id UUID NOT NULL,
      content TEXT NOT NULL,
      read_by UUID[] NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END $$;

-- Ensure read_by is an array of UUIDs
DO $$
BEGIN
  ALTER TABLE messages 
  ALTER COLUMN read_by TYPE UUID[] USING read_by::UUID[];
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not convert read_by to UUID array. Error: %', SQLERRM;
END $$;

-- ==============================================================
-- STEP 3: SHOW CURRENT DATA FOR DEBUGGING
-- ==============================================================

-- Check current conversations
SELECT 'Current conversations:' as info;
SELECT * FROM conversations LIMIT 10;

-- Check current messages
SELECT 'Current messages:' as info;
SELECT * FROM messages LIMIT 10;

-- Check database indexes
SELECT 'Checking database indexes:' as info;
SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM 
  pg_indexes 
WHERE 
  tablename IN ('conversations', 'messages');

-- ==============================================================
-- STEP 4: CLEAN UP (Optional - Uncomment if you want to clear data)
-- ==============================================================

-- WARNING: This will delete all conversations and messages!
-- Uncomment the lines below only if you want to start fresh
-- DELETE FROM messages;
-- DELETE FROM conversations;

-- ==============================================================
-- STEP 5: ADD TEST DATA (Optional - Uncomment if needed)
-- ==============================================================

-- Uncomment below to insert test data
-- INSERT INTO conversations (conversation_id, participant_ids, last_message, last_message_at)
-- VALUES ('test_conversation', ARRAY['00000000-0000-0000-0000-000000000000'::UUID, '11111111-1111-1111-1111-111111111111'::UUID], 'Test message', NOW());

-- ==============================================================
-- STEP 6: COMPLETION MESSAGE
-- ==============================================================

SELECT '🚨 EMERGENCY MODE ACTIVE: Row Level Security has been COMPLETELY DISABLED 🚨' as warning;
SELECT 'Database structure has been validated and fixed if needed' as info;
SELECT 'All users now have FULL ACCESS to messaging tables for debugging' as note;
SELECT 'Re-enable security before deploying to production' as reminder;

COMMIT;

-- Add 'is_admin' column to profiles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
    END IF;
END $$;

-- This script assumes the following structure for your database tables:
-- conversations table must have: conversation_id, participant_ids (array of user IDs)
-- messages table must have: id, conversation_id, sender_id, content, read_by, created_at
-- profiles table must have: id (user ID), username, etc.

-- Note: If the 'is_admin' column doesn't exist in your profiles table, this script will add it with a default value of false. 
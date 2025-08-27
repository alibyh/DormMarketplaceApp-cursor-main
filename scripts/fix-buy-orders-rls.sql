-- Fix Row Level Security policies for buy_orders table
-- This script will ensure authenticated users can create, read, update, and delete their own buy orders

-- First, let's check the current RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'buy_orders';

-- Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'buy_orders';

-- Enable RLS on buy_orders table if not already enabled
ALTER TABLE buy_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view all buy orders" ON buy_orders;
DROP POLICY IF EXISTS "Users can insert their own buy orders" ON buy_orders;
DROP POLICY IF EXISTS "Users can update their own buy orders" ON buy_orders;
DROP POLICY IF EXISTS "Users can delete their own buy orders" ON buy_orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON buy_orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON buy_orders;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON buy_orders;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON buy_orders;

-- Create new policies

-- Policy 1: Allow all users to view all buy orders (for browsing)
CREATE POLICY "Enable read access for all users" ON buy_orders
  FOR SELECT USING (true);

-- Policy 2: Allow authenticated users to insert their own buy orders
CREATE POLICY "Enable insert for authenticated users only" ON buy_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy 3: Allow users to update their own buy orders
CREATE POLICY "Enable update for users based on user_id" ON buy_orders
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy 4: Allow users to delete their own buy orders
CREATE POLICY "Enable delete for users based on user_id" ON buy_orders
  FOR DELETE USING (auth.uid() = user_id);

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'buy_orders'
ORDER BY policyname;

-- Test the policies by checking if a user can insert (this will fail without auth, but shows the policy exists)
-- Note: This is just to verify the policy syntax, not to actually test with real auth
SELECT 'RLS policies for buy_orders table have been updated successfully' as status;

-- Also check if there are any similar issues with the products table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'products';

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'products';

COMMIT;

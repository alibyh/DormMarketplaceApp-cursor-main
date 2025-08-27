-- Check if blocking system is properly set up
-- Run this script to verify the blocking system installation

-- Check if blocked_users table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'blocked_users'
        ) THEN '✅ blocked_users table exists'
        ELSE '❌ blocked_users table does not exist - run blocking-system.sql'
    END as table_status;

-- Check if RPC functions exist
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = 'is_user_blocked'
        ) THEN '✅ is_user_blocked function exists'
        ELSE '❌ is_user_blocked function does not exist - run blocking-system.sql'
    END as function_status;

-- Check if RLS is enabled on blocked_users
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM pg_tables 
            WHERE tablename = 'blocked_users' 
            AND rowsecurity = true
        ) THEN '✅ RLS is enabled on blocked_users table'
        ELSE '❌ RLS is not enabled on blocked_users table - run blocking-system.sql'
    END as rls_status;

-- Check if policies exist
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM pg_policies 
            WHERE tablename = 'blocked_users'
        ) THEN '✅ RLS policies exist for blocked_users table'
        ELSE '❌ RLS policies do not exist for blocked_users table - run blocking-system.sql'
    END as policies_status;

-- Instructions if something is missing:
-- 1. Go to your Supabase dashboard
-- 2. Navigate to SQL Editor
-- 3. Run the blocking-system.sql script
-- 4. This will create all necessary tables, functions, and policies

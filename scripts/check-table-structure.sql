-- Check table structure to understand the correct column names
-- Run this first to see what columns actually exist

-- Check products table structure
SELECT 'PRODUCTS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;

-- Check buy_orders table structure
SELECT 'BUY_ORDERS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'buy_orders' 
ORDER BY ordinal_position;

-- Check conversations table structure
SELECT 'CONVERSATIONS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'conversations' 
ORDER BY ordinal_position;

-- Check messages table structure
SELECT 'MESSAGES TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;

-- Check if blocked_users table exists
SELECT 'BLOCKED_USERS TABLE EXISTS:' as info;
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'blocked_users'
) as blocked_users_exists;

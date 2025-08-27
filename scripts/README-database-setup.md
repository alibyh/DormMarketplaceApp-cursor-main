# Database Setup Instructions

## Problem
The buy order photo upload is failing due to Row Level Security (RLS) policy violations. The error message is:
```
new row violates row-level security policy for table "buy_orders"
```

## Solution
We need to fix the RLS policies and create database functions as fallbacks.

## Step-by-Step Instructions

### 1. Fix RLS Policies

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Create a new query and paste the contents of `scripts/fix-buy-orders-rls.sql`
4. Execute the query

This will:
- Enable RLS on the buy_orders table
- Create proper policies for authenticated users
- Allow users to create, read, update, and delete their own buy orders

### 2. Create Database Functions (Optional Fallback)

1. In the **SQL Editor**, create another new query
2. Paste the contents of `scripts/create-buy-order-function.sql`
3. Execute the query

This creates two functions:
- `create_buy_order_with_auth()` - for buy orders
- `create_product_with_auth()` - for products

These functions serve as fallbacks if the RLS policies still cause issues.

### 3. Verify the Setup

Run this query to check if everything is set up correctly:

```sql
-- Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('buy_orders', 'products');

-- Check policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('buy_orders', 'products');

-- Check functions
SELECT 
  proname as function_name,
  proargtypes::regtype[] as parameter_types
FROM pg_proc 
WHERE proname IN ('create_buy_order_with_auth', 'create_product_with_auth');
```

### 4. Test the Fix

After running the SQL scripts:

1. Try creating a buy order with photos in your app
2. Check the console logs for any remaining errors
3. The app should now handle RLS errors gracefully

## Alternative Quick Fix

If you want to temporarily disable RLS for testing:

```sql
-- TEMPORARY: Disable RLS on buy_orders table
ALTER TABLE buy_orders DISABLE ROW LEVEL SECURITY;

-- WARNING: This removes all security restrictions
-- Only use for testing, re-enable before production
```

To re-enable later:
```sql
ALTER TABLE buy_orders ENABLE ROW LEVEL SECURITY;
```

## Troubleshooting

### If you still get RLS errors:
1. Check that you're authenticated in the app
2. Verify the user ID is being passed correctly
3. Check the console logs for detailed error messages

### If the functions don't exist:
1. Make sure you executed the SQL script completely
2. Check for any syntax errors in the SQL
3. Try running the function creation script again

### If image upload still fails:
1. Check the storage bucket permissions
2. Verify the bucket names are correct
3. Check the console logs for upload-specific errors

## Files Modified

The following files have been updated to handle these issues:

- `screens/PlaceAdScreen/PlaceAdScreen.js` - Enhanced error handling and fallback mechanisms
- `scripts/fix-buy-orders-rls.sql` - RLS policy fixes
- `scripts/create-buy-order-function.sql` - Database functions
- `scripts/test-storage-buckets.js` - Storage testing script
- `scripts/test-image-upload.js` - Upload testing script

## Support

If you continue to have issues after following these steps, please check:
1. The console logs for specific error messages
2. The Supabase dashboard for any database errors
3. The network tab for failed API calls


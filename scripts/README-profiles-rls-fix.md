# Fix Profiles RLS Policy Issue

## Problem
When trying to create a new user account, you get this error:
```
ERROR Profile creation error: {"code": "42501", "details": null, "hint": null, "message": "new row violates row-level security policy for table \"profiles\""}
```

## Root Cause
The `profiles` table has Row Level Security (RLS) enabled, but it's missing the INSERT policy that allows users to create their own profile during signup. The current policies only allow SELECT and UPDATE operations.

## Solution

### Step 1: Run the Fix Script
1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor** in the left sidebar
3. Create a new query
4. Copy the entire contents of `scripts/fix-profiles-rls.sql` and paste it into the query editor
5. Click **Run** to execute the script

### Step 2: What the Script Does
The script will:
1. **Add missing columns** to the profiles table that are used in the signup process:
   - `name` (TEXT)
   - `phone_number` (TEXT)
   - `allow_phone_contact` (BOOLEAN, default false)
   - `is_admin` (BOOLEAN, default false)
   - `product_count` (INTEGER, default 0)
   - `pending_deletion` (BOOLEAN, default false)
   - `deletion_requested_at` (TIMESTAMP)
   - `admin_deletion_requested` (BOOLEAN, default false)
   - `is_deleted` (BOOLEAN, default false)
   - `deleted_at` (TIMESTAMP)

2. **Fix RLS policies** by adding the missing INSERT policy:
   - `"Public profiles are viewable by everyone"` - allows SELECT for all users
   - `"Users can insert their own profile"` - allows INSERT for authenticated users (NEW)
   - `"Users can update their own profile"` - allows UPDATE for own profile

### Step 3: Verify the Fix
After running the script, you should see:
- Success messages confirming the policies were updated
- A list of all columns in the profiles table
- A list of all RLS policies

### Step 4: Test the Fix
1. Try creating a new user account in your app
2. The signup process should now complete successfully
3. Check the console logs to confirm no more RLS errors

## Alternative Quick Fix (Temporary)
If you need a quick temporary fix for testing, you can temporarily disable RLS:

```sql
-- TEMPORARY: Disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Remember to re-enable it later:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

**⚠️ Warning**: Only use this temporary fix for testing. Always re-enable RLS before deploying to production.

## Notes
- The script is safe to run multiple times - it checks if columns exist before adding them
- The script preserves existing data
- All new columns have appropriate default values
- The RLS policies follow the principle of least privilege

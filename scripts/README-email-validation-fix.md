# Fix Email Validation Issues

## Problem
You're getting this error when trying to sign up:
```
ERROR Auth signup error: {"code": "email_address_invalid", "message": "Email address \"godfriedtossou04@gmail.com\" is invalid", "name": "AuthApiError", "status": 400}
```

## Common Causes

### 1. Email Already Exists
The most common cause is that the email address is already registered in your Supabase project. This can happen if:
- You previously tried to sign up with this email
- The user exists but wasn't properly confirmed
- There's a partial registration that failed

### 2. Supabase Project Settings
Your production Supabase project might have different settings than your local development environment:
- Email confirmations might be enabled
- Signup might be disabled
- Rate limiting might be blocking the request

### 3. Email Format Validation
Supabase might have stricter email validation rules than expected.

## Solutions

### Option 1: Quick Fix (Recommended)
1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Run the `scripts/quick-email-fix.sql` script
4. This will:
   - Check if the email already exists
   - Confirm the existing user if found
   - Enable signup if disabled
   - Disable email confirmations for immediate access
   - Clean up any orphaned profiles

### Option 2: Manual Check
1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Run the `scripts/fix-email-validation.sql` script
4. This will show you:
   - If the email already exists
   - Current auth settings
   - Any rate limiting issues
   - Orphaned profiles

### Option 3: Manual Fix via Dashboard
1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication > Users**
3. Search for `godfriedtossou04@gmail.com`
4. If found:
   - Click on the user
   - Click "Confirm" if they're not confirmed
   - Or delete the user to allow re-registration

### Option 4: Use a Different Email
If you want to test quickly, try using a different email address:
- `test@example.com`
- `user123@gmail.com`
- Or any other valid email format

## Prevention
To avoid this issue in the future:

1. **Clear test data regularly**:
   ```sql
   DELETE FROM auth.users WHERE email LIKE '%test%';
   DELETE FROM profiles WHERE email LIKE '%test%';
   ```

2. **Use unique emails for testing**:
   - `test1@example.com`
   - `test2@example.com`
   - Or use timestamps: `test${Date.now()}@example.com`

3. **Check Supabase settings**:
   - Ensure signup is enabled
   - Configure email confirmations as needed
   - Set appropriate rate limits

## Testing the Fix
After running the fix:
1. Try signing up again with the same email
2. If it works, the issue was likely a duplicate email
3. If it still fails, check the Supabase logs for more details

## Notes
- The quick fix script is safe to run multiple times
- It won't delete existing confirmed users
- It will clean up any orphaned data
- Always test with a fresh email if you're unsure

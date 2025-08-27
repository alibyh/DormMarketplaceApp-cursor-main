# Hybrid Account Deletion System

## Overview
This system implements a hybrid deletion process for user accounts. When a user requests account deletion:
- **Immediate deletion**: Products, buy orders, profile data, and images are deleted immediately
- **Preserved data**: Email and username are preserved for admin deletion
- **Admin notification**: Sent to admin (currently logged to console)
- **Login blocking**: Users cannot log in while their account is pending deletion
- **Admin cleanup**: After 24 hours, admin manually deletes email and username

## Database Migration
Run the following SQL scripts in your Supabase SQL Editor:

1. **Add pending deletion columns:**
   ```sql
   -- Run: scripts/add-pending-deletion-columns.sql
   ```

2. **Add deleted user tracking columns:**
   ```sql
   -- Run: scripts/add-deleted-user-tracking.sql
   ```

3. **Create admin deletion function:**
   ```sql
   -- Run: scripts/admin-delete-user.sql
   ```

## How It Works

### **Immediate Deletion (User Side):**
- ✅ Products and images deleted immediately
- ✅ Buy orders and images deleted immediately  
- ✅ Profile picture deleted from storage
- ✅ Profile data cleared (dorm, phone, etc.)
- ✅ Account marked as pending deletion
- ✅ Email and username preserved for admin

### **Admin Deletion Process:**
1. **Check console logs** for deletion requests
2. **Run preparation function** to remove all foreign key references:
   - Messages: `sender_id` set to null, `sender_deleted` set to true
   - Conversations: `buyer_id`/`seller_id` set to null, `buyer_deleted`/`seller_deleted` set to true
   - Profile: **Completely deleted** from profiles table
3. **Delete from auth.users** table safely (no foreign key violations)
4. **Messages and conversations** show "Deleted Account" for deleted users

### **Benefits:**
- ✅ **No foreign key violations** - profile completely deleted, all references removed
- ✅ **Preserves conversations** - shows "Deleted Account" instead of breaking
- ✅ **Admin control** - manual review before permanent deletion
- ✅ **Compliance** - satisfies Apple's deletion requirements
- ✅ **Clean deletion** - no orphaned data left in database

## How It Works

### For Users Who Request Deletion:
1. **Immediate Deletion Process:**
   - User clicks "Delete Account" in AccountScreen
   - **All products and images** are deleted immediately
   - **All buy orders and images** are deleted immediately
   - **Profile picture** is deleted from storage
   - **Profile data** (dorm, phone, etc.) is cleared
   - Account is marked as `pending_deletion = true`
   - **Email and username** are preserved for admin deletion

2. **Admin Notification:**
   - Console log shows deletion request details
   - In production, email would be sent to alibyh@mail.ru
   - Contains: User ID, Email, Username, Request timestamp

3. **User Experience:**
   - Cannot log in while pending deletion
   - Shows "Account Pending Deletion" message
   - Directed to contact support if they want to cancel

### For Admin (Manual Deletion):
1. **Check Pending Deletions:**
   ```sql
   SELECT * FROM profiles 
   WHERE pending_deletion = true 
   AND deletion_requested_at < NOW() - INTERVAL '24 hours';
   ```

2. **Prepare Account for Auth Deletion:**
   ```sql
   -- Run the preparation function
   SELECT prepare_account_for_auth_deletion('user-uuid-here');
   ```

3. **Delete from Auth Users:**
   ```sql
   -- Now you can safely delete from auth.users
   DELETE FROM auth.users WHERE id = 'user-uuid-here';
   ```

4. **Alternative: Use the JavaScript function:**
   ```javascript
   // In your admin panel or script
   import { prepareAccountForAuthDeletion } from './services/accountDeletionService';
   
   await prepareAccountForAuthDeletion('user-uuid-here');
   // Then delete from auth.users via Supabase dashboard
   ```

## User Flow

### Account Deletion Request:
1. User goes to Account → Delete Account
2. Confirms deletion
3. **All data deleted immediately** (products, buy orders, profile data)
4. Account marked as pending deletion (email/username preserved)
5. Admin notification sent
6. User signed out
7. Success message: "Account deleted, email/username will be removed by admin within 24 hours"

### Login Attempt While Pending:
1. User tries to log in
2. System checks `pending_deletion` flag
3. If true, shows "Account pending deletion" message
4. User cannot access the app
5. Directed to contact support

## Admin Tasks

### Daily Check:
1. Check for accounts pending deletion for >24 hours
2. Manually delete those accounts
3. Clear the `pending_deletion` flag

### Email Integration (Future):
- Replace console.log with actual email service
- Send to alibyh@mail.ru with deletion details
- Include user information for admin review

## Benefits:
- ✅ **Compliance:** Satisfies Apple's deletion requirements
- ✅ **Immediate Data Removal:** Products and personal data deleted immediately
- ✅ **Admin Control:** Email/username preserved for admin review
- ✅ **User Experience:** Clear messaging about deletion status
- ✅ **Security:** Prevents access during pending deletion
- ✅ **Efficiency:** Most data deleted immediately, only sensitive data preserved

## Testing:
1. Create a test account
2. Request account deletion
3. Try to log in (should be blocked)
4. Check console for admin notification
5. Verify database has pending_deletion = true

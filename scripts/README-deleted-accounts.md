# Deleted Accounts Setup

## Overview
This feature allows users to delete their accounts while preserving conversation history. When a user deletes their account:
- All personal data is removed (products, buy orders, profile info)
- Conversations remain visible to other users
- Deleted users show as "Deleted Account" with placeholder images

## Database Migration

### Step 1: Run the Migration Script
Execute the following SQL script in your Supabase SQL editor:

```sql
-- Run this in Supabase SQL Editor
\i scripts/add-deleted-account-columns.sql
```

Or copy and paste the contents of `scripts/add-deleted-account-columns.sql` directly into the Supabase SQL editor.

### Step 2: Verify the Migration
After running the migration, you should see:
- `is_deleted` column added to `profiles` table
- `deleted_at` column added to `profiles` table
- New indexes for better performance
- Updated RLS policies

## How It Works

### For Users Who Delete Their Account:
1. All products and buy orders are deleted
2. Profile is updated to "Deleted Account" status
3. Avatar is set to `deleted_user_placeholder.png`
4. `is_deleted` flag is set to `true`
5. `deleted_at` timestamp is recorded

### For Users Chatting with Deleted Accounts:
1. Conversations remain visible
2. Username shows as "Deleted Account"
3. Avatar shows placeholder image
4. Product images show placeholder
5. Cannot send new messages to deleted users

## Fallback Support
The app includes fallback logic to work even if the new database columns don't exist:
- Checks for `is_deleted` flag first
- Falls back to checking if username is "Deleted Account"
- Falls back to checking if avatar is `deleted_user_placeholder.png`

## Testing
1. Create a test account
2. Have another user start a conversation
3. Delete the test account
4. Verify the conversation shows "Deleted Account" for the other user
5. Verify placeholder images are displayed

## Troubleshooting

### If you get "column not found" errors:
1. Make sure you've run the migration script
2. Check that the columns exist in your Supabase dashboard
3. The app will work with fallback logic even without the new columns

### If deleted accounts don't show properly:
1. Check that the placeholder images exist in the assets folder
2. Verify the translation keys are added to i18n.js
3. Check the console for any errors

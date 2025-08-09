# DormMarketplace Database Scripts

## Fix Messaging Permissions Issue

The SQL script in this directory (`setup-supabase-policies.sql`) is designed to fix issues with the messaging system related to Row Level Security (RLS) policies in Supabase.

### How to Run the Script

1. Log in to your Supabase dashboard at [https://app.supabase.com/](https://app.supabase.com/)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Create a new query or use an existing one
5. Copy the entire contents of `setup-supabase-policies.sql` and paste it into the query editor
6. Click **Run** to execute the script
7. You should see a success message if the script runs correctly

### What This Script Does

1. **Temporarily disables** Row Level Security (RLS) on the `conversations` and `messages` tables to allow initial setup
2. **Drops any existing policies** to avoid conflicts with new ones
3. **Re-enables RLS** on both tables
4. **Creates new security policies** that govern:
   - Who can create conversations
   - Who can view conversations
   - Who can update conversations
   - Who can send messages
   - Who can view messages
   - Who can update messages (mark as read)
5. Adds an `is_admin` column to the profiles table if it doesn't exist, which allows for admin users to have universal access

### Common Errors This Fixes

If you've seen errors like:
- `new row violates row-level security policy for table "conversations"`
- `malformed array literal`

These are related to the Row Level Security policies, and this script should resolve them by implementing proper permissions.

### Required Database Structure

This script assumes you have the following table structure:

**conversations table:**
- `conversation_id` (text, primary key)
- `participant_ids` (array of user IDs)
- `last_message` (text)
- `last_message_at` (timestamp)

**messages table:**
- `id` (uuid, primary key)
- `conversation_id` (references conversations)
- `sender_id` (user ID)
- `content` (text)
- `read_by` (array of user IDs)
- `created_at` (timestamp)

**profiles table:**
- `id` (references auth.users)
- `username` (text)
- Other profile fields

### Recovering from Stuck Temporary Messages

If you're experiencing issues with messages that appear but aren't actually saved in the database (stuck temporary messages), you can:

1. Use the "Clear All" button in the Conversations screen
2. Restart the app
3. Sign out and sign back in

These steps will clear the AsyncStorage where temporary messages are stored. 
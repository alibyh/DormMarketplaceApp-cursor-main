# Migrating from Back4App (Parse) to Supabase

This document provides instructions for migrating the Dorm Marketplace App from Back4App (Parse) to Supabase.

## Step 1: Set Up Supabase Project

1. Sign up for a free Supabase account at [https://supabase.com](https://supabase.com)
2. Create a new project
3. Note your Supabase URL and public anon key (you'll need these later)

## Step 2: Set Up Database Schema

1. Go to the SQL Editor in your Supabase dashboard
2. Run the SQL queries from the `services/supabaseSchema.sql` file
3. This will create all the necessary tables with the appropriate relations and security policies

## Step 3: Update Configuration

1. Open `services/supabaseConfig.js`
2. Replace the placeholder values with your actual Supabase URL and anon key:
   ```javascript
   const supabaseUrl = 'YOUR_SUPABASE_URL';
   const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
   ```

## Step 4: Data Migration

To migrate your existing data from Back4App to Supabase, you have two options:

### Option A: Manual Migration (for small datasets)

1. Export your data from Back4App:
   - Go to your Back4App dashboard
   - Navigate to each class
   - Export as JSON

2. Transform the data to match Supabase schema
   - Parse pointers need to be converted to UUID references
   - Parse files need to be uploaded to Supabase Storage

3. Import to Supabase:
   - Use the Supabase UI or API to import the transformed data

### Option B: Automated Migration (for larger datasets)

1. Write a migration script that:
   - Fetches data from Parse API
   - Transforms it to fit Supabase schema
   - Inserts it into Supabase
   - Handles file transfers

2. Sample migration script structure:
   ```javascript
   // migration.js
   import Parse from 'parse/node';
   import { createClient } from '@supabase/supabase-js';
   
   // Initialize Parse
   Parse.initialize('YOUR_PARSE_APP_ID', 'YOUR_PARSE_JS_KEY');
   Parse.serverURL = 'YOUR_PARSE_SERVER_URL';
   
   // Initialize Supabase
   const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_KEY');
   
   async function migrateUsers() {
     // Fetch users from Parse
     // Transform data
     // Insert into Supabase
   }
   
   async function migrateProducts() {
     // Similar process for products
   }
   
   // etc. for other data types
   
   async function migrate() {
     await migrateUsers();
     await migrateProducts();
     // etc.
   }
   
   migrate().catch(console.error);
   ```

## Step 5: Update Auth Flow

1. Update all login/signup screens to use the new Supabase authentication:
   - Import auth methods from `services/authService.js`
   - Update forms to use email/password (Supabase's default auth method)

2. The Supabase auth flow differs from Parse:
   - Supabase uses JWT tokens
   - Auth state is managed via `supabase.auth.onAuthStateChange`
   - User profiles are stored separately from auth data

## Step 6: Update Queries

1. All Parse queries need to be replaced with Supabase queries:
   - Replace `Parse.Query` with Supabase's query builder
   - Replace Parse Pointers with direct UUID references
   - Replace Parse ACL with Supabase RLS policies

2. Use the service files to abstract database access:
   - `services/authService.js` for authentication
   - `services/productService.js` for product operations
   - `services/messageService.js` for messaging

## Step 7: Update Real-time Features

1. Replace Parse LiveQuery with Supabase Realtime:
   - Subscribe to database changes with `supabase.channel()`
   - Use the React hooks pattern for managing subscriptions

## Step 8: Update File Storage

1. Replace Parse Files with Supabase Storage:
   - Upload files to the proper bucket
   - Use public URLs for images
   - Handle permissions with RLS policies

## Step 9: Testing

1. Test all features thoroughly:
   - Authentication
   - Product listing and creation
   - Messaging
   - Real-time updates

## Step 10: Deployment

1. Once testing is complete, update your production app:
   - Update configuration to point to production Supabase project
   - Consider implementing a feature flag to switch gradually

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase with React Native](https://supabase.com/docs/guides/getting-started/tutorials/with-react-native)
- [Row Level Security in Supabase](https://supabase.com/docs/guides/auth/row-level-security) 
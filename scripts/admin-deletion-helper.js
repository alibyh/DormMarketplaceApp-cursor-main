// Admin Deletion Helper Script
// This script helps admin delete users from auth.users table safely

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (you'll need to add your credentials)
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_SERVICE_ROLE_KEY' // Use service role key for admin operations
);

/**
 * Prepare account for auth user deletion
 * @param {string} userId - The user ID to prepare for deletion
 */
export const prepareAccountForAuthDeletion = async (userId) => {
  try {
    console.log('Preparing account for auth user deletion...');
    
    // Step 1: Update all messages to remove sender_id references
    const { error: messagesError } = await supabase
      .from('messages')
      .update({ 
        sender_id: null,
        sender_deleted: true 
      })
      .eq('sender_id', userId);

    if (messagesError) {
      console.error('Error updating messages:', messagesError);
      throw messagesError;
    }

    // Step 2: Update all conversations to remove participant references
    const { error: conversationsError } = await supabase
      .from('conversations')
      .update({ 
        buyer_id: null,
        seller_id: null,
        participant_ids: null,
        buyer_deleted: true,
        seller_deleted: true
      })
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

    if (conversationsError) {
      console.error('Error updating conversations:', conversationsError);
      throw conversationsError;
    }

    // Step 3: Delete the profile completely (this removes the foreign key reference)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      throw profileError;
    }

    console.log('Account prepared for auth user deletion successfully');
    return { success: true };
  } catch (error) {
    console.error('Error preparing account for auth deletion:', error);
    throw error;
  }
};

/**
 * Get users pending deletion
 */
export const getUsersPendingDeletion = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, email, deletion_requested_at')
      .eq('pending_deletion', true)
      .lt('deletion_requested_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('Error fetching pending deletions:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error getting users pending deletion:', error);
    throw error;
  }
};

/**
 * Complete user deletion process
 * @param {string} userId - The user ID to delete
 */
export const completeUserDeletion = async (userId) => {
  try {
    console.log(`Starting deletion process for user: ${userId}`);
    
    // Step 1: Prepare account for deletion
    await prepareAccountForAuthDeletion(userId);
    
    // Step 2: Delete from auth.users (this requires admin access)
    // Note: This step needs to be done manually in Supabase dashboard
    // or via admin API call
    
    console.log('Account prepared successfully. Now delete from auth.users manually.');
    console.log('Go to Supabase Dashboard > Authentication > Users');
    console.log(`Find user with ID: ${userId} and delete them.`);
    
    return { success: true, message: 'Account prepared. Delete from auth.users manually.' };
  } catch (error) {
    console.error('Error completing user deletion:', error);
    throw error;
  }
};

// Example usage:
// const pendingUsers = await getUsersPendingDeletion();
// console.log('Users pending deletion:', pendingUsers);
// 
// for (const user of pendingUsers) {
//   await completeUserDeletion(user.id);
// }

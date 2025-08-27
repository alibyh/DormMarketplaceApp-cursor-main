import supabase from './supabaseConfig';

export const requestAccountDeletion = async (userId, userEmail, username) => {
  try {
    // Update profile to mark as pending deletion (preserve email and username)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        pending_deletion: true,
        deletion_requested_at: new Date().toISOString(),
        admin_deletion_requested: true,
        // Clear other profile data but preserve email and username
        dorm: '',
        phone_number: '',
        avatar_url: 'deleted_user_placeholder.png',
        allow_phone_contact: false
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error marking account for deletion:', updateError);
      throw updateError;
    }

    // Send email notification to admin (for testing)
    await sendAdminDeletionNotification(userId, userEmail, username);

    return { success: true };
  } catch (error) {
    console.error('Error requesting account deletion:', error);
    throw error;
  }
};

// New function to prepare account for auth user deletion
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
      console.error('Error deleting profile:', profileError);
      throw profileError;
    }

    console.log('Account prepared for auth user deletion successfully');
    return { success: true };
  } catch (error) {
    console.error('Error preparing account for auth deletion:', error);
    throw error;
  }
};

const sendAdminDeletionNotification = async (userId, userEmail, username) => {
  try {
    // For now, we'll just log the deletion request
    // In production, you would integrate with an email service
    console.log('=== ACCOUNT DELETION REQUEST ===');
    console.log('User ID:', userId);
    console.log('User Email:', userEmail);
    console.log('Username:', username);
    console.log('Requested at:', new Date().toISOString());
    console.log('Admin Email: alibyh@mail.ru');
    console.log('===============================');

    // TODO: Integrate with email service to send to alibyh@mail.ru
    // Example with a hypothetical email service:
    // await emailService.send({
    //   to: 'alibyh@mail.ru',
    //   subject: 'Account Deletion Request',
    //   body: `User ${username} (${userEmail}) has requested account deletion. User ID: ${userId}`
    // });

  } catch (error) {
    console.error('Error sending admin notification:', error);
    // Don't throw error here as the main deletion request should still succeed
  }
};

export const checkPendingDeletion = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('pending_deletion, deletion_requested_at, admin_deletion_requested')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking pending deletion:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error checking pending deletion:', error);
    return null;
  }
};

export const cancelAccountDeletion = async (userId) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        pending_deletion: false,
        deletion_requested_at: null,
        admin_deletion_requested: false
      })
      .eq('id', userId);

    if (error) {
      console.error('Error canceling account deletion:', error);
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error canceling account deletion:', error);
    throw error;
  }
};

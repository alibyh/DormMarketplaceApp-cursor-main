import supabase from './supabaseConfig';
import { getCurrentUser } from './messageService';

// Block a user
export const blockUser = async (userIdToBlock) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    if (currentUser.id === userIdToBlock) {
      throw new Error('Cannot block yourself');
    }

    // Check if table exists first
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: currentUser.id,
          blocked_id: userIdToBlock
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('User is already blocked');
        }
        if (error.code === '42P01') { // Table doesn't exist
          throw new Error('Blocking system not set up. Please run the database migration.');
        }
        throw error;
      }

      return { success: true, data };
    } catch (tableError) {
      if (tableError.message.includes('not set up')) {
        throw tableError;
      }
      // If table doesn't exist, create a simple blocking record
      console.log('Blocked_users table not found, blocking system not fully set up');
      throw new Error('Blocking system not fully configured. Please run the database migration script.');
    }
  } catch (error) {
    console.error('Error blocking user:', error);
    throw error;
  }
};

// Unblock a user
export const unblockUser = async (userIdToUnblock) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', currentUser.id)
      .eq('blocked_id', userIdToUnblock)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error unblocking user:', error);
    throw error;
  }
};

// Check if a user is blocked by current user
export const isUserBlocked = async (userIdToCheck) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return false;
    }

    // First try the RPC function, if it doesn't exist, fall back to direct query
    try {
      const { data, error } = await supabase
        .rpc('is_user_blocked', {
          blocker_uuid: currentUser.id,
          blocked_uuid: userIdToCheck
        });

      if (error) {
        throw error;
      }

      return data;
    } catch (rpcError) {
      // If RPC function doesn't exist, use direct query
      console.log('RPC function not available, using direct query');
      const { data, error } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', currentUser.id)
        .eq('blocked_id', userIdToCheck)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    }
  } catch (error) {
    console.error('Error checking if user is blocked:', error);
    return false;
  }
};

// Check if current user is blocked by another user
export const isBlockedByUser = async (userIdToCheck) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return false;
    }

    // First try the RPC function, if it doesn't exist, fall back to direct query
    try {
      const { data, error } = await supabase
        .rpc('is_user_blocked', {
          blocker_uuid: userIdToCheck,
          blocked_uuid: currentUser.id
        });

      if (error) {
        throw error;
      }

      return data;
    } catch (rpcError) {
      // If RPC function doesn't exist, use direct query
      console.log('RPC function not available, using direct query');
      const { data, error } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', userIdToCheck)
        .eq('blocked_id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    }
  } catch (error) {
    console.error('Error checking if blocked by user:', error);
    return false;
  }
};

// Get all users blocked by current user
export const getBlockedUsers = async () => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return [];
    }

    // First try the RPC function, if it doesn't exist, fall back to direct query
    try {
      const { data, error } = await supabase
        .rpc('get_blocked_users', {
          user_uuid: currentUser.id
        });

      if (error) {
        throw error;
      }

      // Get user profiles for blocked users
      if (data && data.length > 0) {
        const blockedUserIds = data.map(item => item.blocked_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, dorm')
          .in('id', blockedUserIds);

        if (profilesError) {
          throw profilesError;
        }

        return profiles || [];
      }

      return [];
    } catch (rpcError) {
      // If RPC function doesn't exist, use direct query
      console.log('RPC function not available, using direct query');
      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', currentUser.id);

      if (error) {
        throw error;
      }

      // Get user profiles for blocked users
      if (data && data.length > 0) {
        const blockedUserIds = data.map(item => item.blocked_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, dorm')
          .in('id', blockedUserIds);

        if (profilesError) {
          throw profilesError;
        }

        return profiles || [];
      }

      return [];
    }
  } catch (error) {
    console.error('Error getting blocked users:', error);
    return [];
  }
};

// Get all users who blocked current user
export const getBlockers = async () => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return [];
    }

    // First try the RPC function, if it doesn't exist, fall back to direct query
    try {
      const { data, error } = await supabase
        .rpc('get_blockers', {
          user_uuid: currentUser.id
        });

      if (error) {
        throw error;
      }

      // Get user profiles for blockers
      if (data && data.length > 0) {
        const blockerIds = data.map(item => item.blocker_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, dorm')
          .in('id', blockerIds);

        if (profilesError) {
          throw profilesError;
        }

        return profiles || [];
      }

      return [];
    } catch (rpcError) {
      // If RPC function doesn't exist, use direct query
      console.log('RPC function not available, using direct query');
      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocker_id')
        .eq('blocked_id', currentUser.id);

      if (error) {
        throw error;
      }

      // Get user profiles for blockers
      if (data && data.length > 0) {
        const blockerIds = data.map(item => item.blocker_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, dorm')
          .in('id', blockerIds);

        if (profilesError) {
          throw profilesError;
        }

        return profiles || [];
      }

      return [];
    }
  } catch (error) {
    console.error('Error getting blockers:', error);
    return [];
  }
};

// Check if two users can interact (neither has blocked the other)
export const canUsersInteract = async (userId1, userId2) => {
  try {
    // Check if userId1 has blocked userId2
    const { data: blocked1, error: error1 } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', userId1)
      .eq('blocked_id', userId2)
      .single();

    // Check if userId2 has blocked userId1
    const { data: blocked2, error: error2 } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', userId2)
      .eq('blocked_id', userId1)
      .single();

    // Users can interact if neither has blocked the other
    const user1BlockedUser2 = !error1 && !!blocked1;
    const user2BlockedUser1 = !error2 && !!blocked2;

    return !user1BlockedUser2 && !user2BlockedUser1;
  } catch (error) {
    console.error('Error checking if users can interact:', error);
    return false;
  }
};

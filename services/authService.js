import supabase from './supabaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sign up a new user
export const signUp = async (email, username, password) => {
  try {
    console.log('=== Auth Service: Starting Signup ===');

    // 1. Basic validation
    if (!email || !username || !password) {
      throw new Error('Missing required fields');
    }

    // 2. Check existing email/username first
    const { data: existing, error: checkError } = await supabase
      .from('profiles')
      .select('email, username')
      .or(`email.eq.${email},username.eq.${username}`)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing user:', checkError);
    }

    if (existing?.email === email) {
      return { error: { code: 'email_in_use', message: 'Email already in use' }};
    }
    if (existing?.username === username) {
      return { error: { code: 'username_taken', message: 'Username already taken' }};
    }

    // 3. Clear any existing sessions
    await supabase.auth.signOut();
    await AsyncStorage.removeItem('supabase.auth.token');

    // 4. Basic signup without any metadata
    console.log('Attempting basic auth signup...');
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password
    });

    if (error) {
      console.error('Auth signup error:', {
        name: error.name,
        message: error.message,
        code: error.code,
        status: error.status
      });
      return { error };
    }

    if (!data?.user?.id) {
      console.error('No user data returned:', data);
      return { error: { message: 'No user data returned' }};
    }

    console.log('Auth signup successful:', {
      userId: data.user.id,
      email: data.user.email
    });

    return { data };

  } catch (error) {
    console.error('Auth service error:', error);
    return { 
      error: {
        message: error.message || 'Signup failed',
        code: error.code || 'unknown_error'
      }
    };
  }
};

// Log in an existing user
export const logIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Log out the current user
export const logOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

// Get the current user
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    
    if (user) {
      console.log("Got user from auth:", user.id);
      
      // Try to get profile from database
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.log("No profile found, creating one from metadata...");
        
        // Create a profile if it doesn't exist
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            username: user.user_metadata?.username || 'user_' + user.id.substring(0, 8),
            email: user.email,
            name: user.user_metadata?.name || '',
            surname: user.user_metadata?.surname || '',
            created_at: new Date()
          }]);
          
        if (insertError) {
          console.error("Error creating profile:", insertError);
          // Still return user with metadata as profile
          return {
            ...user,
            profile: {
              id: user.id,
              email: user.email,
              username: user.user_metadata?.username,
              name: user.user_metadata?.name,
              surname: user.user_metadata?.surname
            }
          };
        }
        
        // Try to get the newly created profile
        const { data: newProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        return { ...user, profile: newProfile };
      }
      
      // Return user with existing profile
      return { ...user, profile };
    }
    
    return null;
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (userId, updates) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

// Listen for auth state changes
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};

// Add this new function to your authService.js
export const cleanupAuthTokens = async () => {
  console.log('[Auth] Starting complete auth cleanup...');
  try {
    // Get all storage keys
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Filter for Supabase-related keys
    const authKeys = allKeys.filter(key => 
      key.includes('supabase') || 
      key.includes('sb-') || 
      key.includes('auth')
    );
    
    if (authKeys.length > 0) {
      console.log(`[Auth] Removing ${authKeys.length} auth-related keys`);
      await AsyncStorage.multiRemove(authKeys);
    }
    
    // Also remove specific error flags
    await AsyncStorage.removeItem('last_auth_error');
    await AsyncStorage.removeItem('missing_sub_claim_error');
    await AsyncStorage.removeItem('auth_jwt_error');
    
    console.log('[Auth] All auth tokens completely cleared');
    return true;
  } catch (error) {
    console.error('[Auth] Error during token cleanup:', error);
    return false;
  }
};

// Add this function
export const createUserProfile = async (userId, profileData) => {
  try {
    console.log('Creating profile with service role...', userId);
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        ...profileData
      });
      
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Profile creation service error:', error);
    return { success: false, error };
  }
};

// Update the createInitialProfile function and export it properly
export const createInitialProfile = async (userId, profileData) => {
  try {
    console.log('=== Creating Initial Profile ===');
    console.log('Profile data:', { userId, ...profileData });

    // First check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      console.log('Profile already exists:', existingProfile);
      return { data: existingProfile };
    }

    // Create new profile
    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        id: userId,
        username: profileData.username,
        email: profileData.email,
        name: profileData.name || null,
        dorm: profileData.dorm || null,
        phone_number: profileData.phone_number || null,
        allow_phone_contact: profileData.allow_phone_contact || false,
        is_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Profile creation error:', error);
      throw error;
    }

    console.log('Profile created successfully:', data);
    return { data };

  } catch (error) {
    console.error('Profile creation failed:', error);
    return { 
      error: {
        message: error.message || 'Failed to create profile',
        details: error.details || {},
        code: error.code || 'PROFILE_CREATION_ERROR'
      }
    };
  }
};
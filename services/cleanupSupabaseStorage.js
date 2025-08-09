import AsyncStorage from '@react-native-async-storage/async-storage';

export const forceCleanSupabaseStorage = async () => {
  try {
    console.log('Starting emergency Supabase storage cleanup');
    
    // Get all storage keys
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('Total storage keys:', allKeys.length);
    
    // Filter for Supabase-related keys
    const supabaseKeys = allKeys.filter(key => 
      key.includes('supabase') || 
      key.includes('sb-') || 
      key.includes('auth')
    );
    console.log('Found Supabase related keys:', supabaseKeys.length);
    
    // Remove all Supabase keys
    if (supabaseKeys.length > 0) {
      await AsyncStorage.multiRemove(supabaseKeys);
      console.log('Removed all Supabase keys');
    }
    
    return true;
  } catch (error) {
    console.error('Error during emergency cleanup:', error);
    return false;
  }
}; 
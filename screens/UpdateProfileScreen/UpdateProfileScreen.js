import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../../services/supabaseConfig';
import { handleProfileUpdateError, PROFILE_ERROR_CODES } from '../../utils/profileUpdateErrorHandler';
import { validateProfileForm } from '../../utils/profileValidation';
import { checkNetworkConnection } from '../../utils/networkUtils';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';
import ErrorBoundaryWrapper from '../../components/ErrorBoundary/ErrorBoundaryWrapper';

const UpdateProfileScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { getThemeColors } = useTheme();
  const colors = getThemeColors();

  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userId, setUserId] = useState(null);
  // In the component, update the state declarations
const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    
    name: '',
    username: '',
    dormNumber: '',
    phoneNumber: '',
    allowPhoneContact: false,
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [error, setError] = useState(null);

  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const [profilePhotoChanged, setProfilePhotoChanged] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    // Load any existing temporary photo on mount
    const loadTempPhoto = async () => {
      try {
        const tempPhotoUri = await AsyncStorage.getItem('temp_profile_photo');
        if (tempPhotoUri) {
          console.log("Loading existing temp photo:", tempPhotoUri);
          setProfilePhotoPreview(tempPhotoUri);
          setProfilePhotoChanged(true);
        }
      } catch (error) {
        console.error('Error loading temp photo:', error);
      }
    };
    
    loadTempPhoto();
    
    return () => {
      // Cleanup temporary photo on unmount
      AsyncStorage.removeItem('temp_profile_photo')
        .catch(error => console.error('Error cleaning up temp photo:', error));
    };
  }, []);

  const loadUserData = async () => {
    try {
      
      // Get the authenticated user from Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error fetching user:', userError);
        return;
      }
      
      if (user) {
        setUserId(user.id);
        
        // Fetch user profile from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          console.error('Error fetching profile:', profileError);
          
          // Even if profile fetch fails, try to use metadata
          if (user.user_metadata) {
            
            setFormData({
              name: user.user_metadata.name || '',
              username: user.user_metadata.username || '',
              dormNumber: user.user_metadata.dorm || '',
              phoneNumber: user.user_metadata.phone_number || '',
              allowPhoneContact: user.user_metadata.allow_phone_contact || false,
              password: ''
            });
            
            // Load avatar from metadata if available
            if (user.user_metadata.avatar_url) {
              const avatarUrl = user.user_metadata.avatar_url;
              
              // Check if it's already a complete URL
              if (avatarUrl.startsWith('http')) {
                setProfilePhotoPreview(avatarUrl);
              } else {
                // Get full URL from Supabase
                const { data: urlData } = supabase.storage
                  .from('avatars')
                  .getPublicUrl(avatarUrl);
                  
                if (urlData && urlData.publicUrl) {
                  setProfilePhotoPreview(urlData.publicUrl);
                }
              }
            }
          }
          return;
        }
        
        if (profileData) {
          
          // Map the profile data to our form fields
          setFormData({
            name: profileData.name || '',
            username: profileData.username || '',
            dormNumber: profileData.dorm || '',
            phoneNumber: profileData.phone_number || '',
            allowPhoneContact: profileData.allow_phone_contact || false,
            password: ''
          });
          
          // Load profile photo if available
          if (profileData.avatar_url) {
            // Check if it's already a complete URL
            if (profileData.avatar_url.startsWith('http')) {
              setProfilePhotoPreview(profileData.avatar_url);
            } else {
              // Get the public URL for the avatar
              const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(profileData.avatar_url);
                
              if (urlData && urlData.publicUrl) {
                setProfilePhotoPreview(urlData.publicUrl);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in loadUserData:', error);
    }
  };

  const updateFormData = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Using the successful profile photo upload from AccountScreen
  const pickImage = async () => {
    try {
      console.log("Starting image picker...");
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('Permission Required'), t('Camera roll permission is needed'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log("No image selected");
        return;
      }
      
      const selectedImageUri = result.assets[0].uri;
      console.log("Selected image URI:", selectedImageUri);
      
      // Set the preview immediately
      setProfilePhotoPreview(selectedImageUri);
      setProfilePhotoChanged(true);
      
      // Store the selected image temporarily
      await AsyncStorage.setItem('temp_profile_photo', selectedImageUri);
      console.log("Stored temporary profile photo URI");
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert(t('error'), t('failedToSelectImage'));
    }
  };

  const handleProfilePhotoUpload = async () => {
    try {
      const tempPhotoUri = await AsyncStorage.getItem('temp_profile_photo');
      if (!tempPhotoUri) return null;
  
      // Convert the image to binary data using the same method as SignUpScreen
      const fetchResponse = await fetch(tempPhotoUri);
      if (!fetchResponse.ok) {
        throw new Error('Failed to fetch image');
      }
      
      const arrayBuffer = await fetchResponse.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
  
      const fileName = `${userId}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, uint8Array, {
          contentType: 'image/jpeg',
          upsert: true
        });
  
      if (uploadError) throw uploadError;
  
      return fileName;
    } catch (error) {
      console.error('Photo upload error:', error);
      throw error;
    }
  };
  
  const updateProfileData = async (avatarUrl) => {
    const updates = {
      name: formData.name,
      username: formData.username,
      dorm: formData.dormNumber,
      phone_number: formData.phoneNumber,
      allow_phone_contact: formData.allowPhoneContact,
      updated_at: new Date().toISOString(),
    };
  
    if (avatarUrl) {
      updates.avatar_url = avatarUrl;
    }
  
    // First check if username is taken (excluding current user)
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', formData.username)
      .neq('id', userId)
      .single();
  
    if (checkError && checkError.code !== 'PGRST116') {
      throw { type: PROFILE_ERROR_CODES.DATABASE, error: checkError };
    }
  
    if (existingUser) {
      throw { type: PROFILE_ERROR_CODES.USERNAME_TAKEN };
    }
  
    return await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
  };
  
  const updatePassword = async () => {
    if (!formData.password?.trim()) return { error: null };
  
    return await supabase.auth.updateUser({
      password: formData.password
    });
  };

  const handleUpdateProfile = async () => {
    try {
      setError(null);
      setFormErrors({});
      setIsSubmitting(true);

      // Validate form
      const { isValid, errors } = validateProfileForm(formData, t);
      if (!isValid) {
        setFormErrors(errors);
        return;
      }

      // Check network
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        throw { type: PROFILE_ERROR_CODES.NETWORK };
      }

      // Handle profile photo if changed
      let avatarUrl = null;
      if (profilePhotoChanged) {
        try {
          avatarUrl = await handleProfilePhotoUpload();
          if (avatarUrl) {
            // Get the public URL for the uploaded avatar
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(avatarUrl);
            
            if (urlData && urlData.publicUrl) {
              // Update the preview with the new URL
              setProfilePhotoPreview(urlData.publicUrl);
            }
          }
        } catch (photoError) {
          console.error('Photo upload error:', photoError);
          throw { type: PROFILE_ERROR_CODES.IMAGE_UPLOAD, error: photoError };
        }
      }

      // Update profile data
      const { error: profileError } = await updateProfileData(avatarUrl);
      if (profileError) {
        throw { type: PROFILE_ERROR_CODES.PROFILE_UPDATE, error: profileError };
      }

      // Update password if provided
      if (formData.password?.trim()) {
        const { error: passwordError } = await updatePassword();
        if (passwordError) {
          throw { type: PROFILE_ERROR_CODES.PASSWORD_UPDATE, error: passwordError };
        }
      }

      // Success handling
      // Clean up temporary photo
      if (profilePhotoChanged) {
        await AsyncStorage.removeItem('temp_profile_photo');
        setProfilePhotoChanged(false);
      }
      
      Alert.alert(
        t('Success!'),
        t('Your profile has been updated successfully.'),
        [{ text: t('OK'), onPress: () => navigation.goBack() }]
      );

    } catch (error) {
      console.error('Profile update error:', error);
      if (error.type === PROFILE_ERROR_CODES.USERNAME_TAKEN) {
        setFormErrors({ username: t('usernameTaken') });
      } else {
        setError(t('Could not update your profile. Please try again.'));
      }
      handleProfileUpdateError(error, t);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ErrorBoundaryWrapper
      onRetry={() => {
        setError(null);
        setFormErrors({});
      }}
      loadingMessage={t('updatingProfile')}
      errorMessage={error}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          style={[styles.container, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.title, { color: colors.primary }]}>{t('Update Profile')}</Text>

            {/* Profile Photo */}
            <TouchableOpacity
              style={[styles.profilePhotoContainer, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}
              onPress={pickImage}
            >
              {profilePhotoPreview ? (
                <Image
                  source={{ uri: profilePhotoPreview }}
                  style={styles.profilePhoto}
                  onError={(e) => {
                    console.error('Profile photo load error:', e.nativeEvent.error);
                    console.error('Failed URL:', profilePhotoPreview);
                    // Fall back to default avatar on error
                    setProfilePhotoPreview(null);
                  }}
                  onLoad={() => {
                    console.log('Profile photo loaded successfully:', profilePhotoPreview);
                  }}
                />
              ) : (
                <View style={styles.defaultAvatarContainer}>
                  <Ionicons name="person-circle" size={100} color={colors.textSecondary} />
                  <Text style={[styles.uploadText, { color: colors.textSecondary }]}>{t('Upload Photo')}</Text>
                </View>
              )}
              <View style={[styles.editIconContainer, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera" size={24} color={colors.headerText} />
              </View>
            </TouchableOpacity>

            {/* Form Fields */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('Name')}</Text>
              <TextInput
                style={[
                  styles.input, 
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text },
                  formErrors.name && { borderColor: colors.error, backgroundColor: colors.error + '10' }
                ]}
                placeholder={t('Enter your name')}
                placeholderTextColor={colors.placeholder}
                value={formData.name}
                onChangeText={(text) => {
                  updateFormData('name', text);
                  setFormErrors(prev => ({ ...prev, name: null }));
                }}
              />
              {formErrors.name && (
                <Text style={[styles.errorText, { color: colors.error }]}>{formErrors.name}</Text>
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('Username')}</Text>
              <TextInput
                style={[
                  styles.input, 
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text },
                  formErrors.username && { borderColor: colors.error, backgroundColor: colors.error + '10' }
                ]}
                placeholder={t('Enter a username')}
                placeholderTextColor={colors.placeholder}
                value={formData.username}
                onChangeText={(text) => {
                  updateFormData('username', text);
                  setFormErrors(prev => ({ ...prev, username: null }));
                }}
              />
              {formErrors.username && (
                <Text style={[styles.errorText, { color: colors.error }]}>{formErrors.username}</Text>
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('Dorm')}</Text>
              <TextInput
                style={[
                  styles.input, 
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text },
                  formErrors.dormNumber && { borderColor: colors.error, backgroundColor: colors.error + '10' }
                ]}
                placeholder={t('Enter your dorm')}
                placeholderTextColor={colors.placeholder}
                value={formData.dormNumber}
                onChangeText={(text) => {
                  updateFormData('dormNumber', text);
                  setFormErrors(prev => ({ ...prev, dormNumber: null }));
                }}
              />
              {formErrors.dormNumber && (
                <Text style={[styles.errorText, { color: colors.error }]}>{formErrors.dormNumber}</Text>
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('Phone Number')}</Text>
              <TextInput
                style={[
                  styles.input, 
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text },
                  formErrors.phoneNumber && { borderColor: colors.error, backgroundColor: colors.error + '10' }
                ]}
                placeholder={t('Enter your phone number')}
                placeholderTextColor={colors.placeholder}
                value={formData.phoneNumber}
                onChangeText={(text) => {
                  updateFormData('phoneNumber', text);
                  setFormErrors(prev => ({ ...prev, phoneNumber: null }));
                }}
                keyboardType="phone-pad"
              />
              {formErrors.phoneNumber && (
                <Text style={[styles.errorText, { color: colors.error }]}>{formErrors.phoneNumber}</Text>
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('New Password')} {t('(optional)')}</Text>
              <TextInput
                style={[
                  styles.input, 
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text },
                  formErrors.password && { borderColor: colors.error, backgroundColor: colors.error + '10' }
                ]}
                placeholder={t('Enter new password')}
                placeholderTextColor={colors.placeholder}
                value={formData.password}
                onChangeText={(text) => {
                  updateFormData('password', text);
                  setFormErrors(prev => ({ ...prev, password: null }));
                }}
                secureTextEntry={true}
              />
              {formErrors.password && (
                <Text style={[styles.errorText, { color: colors.error }]}>{formErrors.password}</Text>
              )}
              <Text style={[styles.passwordHint, { color: colors.textSecondary }]}>
                {t('Leave empty to keep current password')}
              </Text>
            </View>

            {/* Allow Phone Contact */}
            <View style={styles.toggleContainer}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>{t('Allow Phone Contact')}</Text>
              <View style={styles.toggleButtons}>
                <TouchableOpacity
                  style={[
                    styles.toggleOption,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    formData.allowPhoneContact && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => updateFormData('allowPhoneContact', true)}
                >
                  <Text style={[
                    styles.toggleText,
                    { color: colors.textSecondary },
                    formData.allowPhoneContact && { color: colors.headerText }
                  ]}>
                    {t('Yes')}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.toggleOption,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    !formData.allowPhoneContact && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => updateFormData('allowPhoneContact', false)}
                >
                  <Text style={[
                    styles.toggleText,
                    { color: colors.textSecondary },
                    !formData.allowPhoneContact && { color: colors.headerText }
                  ]}>
                    {t('No')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.updateButton,
                  { backgroundColor: colors.primary, shadowColor: colors.shadow },
                  isSubmitting && { backgroundColor: colors.disabled }
                ]}
                onPress={handleUpdateProfile}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.headerText} />
                    <Text style={[styles.buttonText, { color: colors.headerText }]}> {t('Updating')}...</Text>
                  </View>
                ) : (
                  <Text style={[styles.buttonText, { color: colors.headerText }]}>{t('Update Profile')}</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.goBack()}
                disabled={isLoading}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{t('Cancel')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          
          {/* Loading Overlay */}
          <LoadingOverlay
            isVisible={isSubmitting}
            message={t('updatingProfile')}
            onTimeout={() => {
              setIsSubmitting(false);
              setError(t('Could not update your profile. Please try again.'));
            }}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ErrorBoundaryWrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  profilePhotoContainer: {
    width: 120,
    height: 120,
    borderRadius: 75,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    position: 'relative',
    overflow: 'visible',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 75,
  },
  defaultAvatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  passwordHint: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  toggleContainer: {
    marginBottom: 25,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  toggleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 8,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  updateButton: {
    padding: 14,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginRight: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    padding: 14,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  }
});

export default UpdateProfileScreen;

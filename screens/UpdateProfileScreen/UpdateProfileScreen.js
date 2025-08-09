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
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../../services/supabaseConfig';
import { handleProfileUpdateError, PROFILE_ERROR_CODES } from '../../utils/profileUpdateErrorHandler';
import { validateProfileForm } from '../../utils/profileValidation';
import { checkNetworkConnection } from '../../utils/networkUtils';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';
import ErrorBoundaryWrapper from '../../components/ErrorBoundary/ErrorBoundaryWrapper';

const UpdateProfileScreen = ({ navigation }) => {
  const { t } = useTranslation();

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
              const avatarFileName = user.user_metadata.avatar_url;
              
              // Get full URL from Supabase
              const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(avatarFileName);
                
              if (urlData && urlData.publicUrl) {
                setProfilePhotoPreview(urlData.publicUrl);
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
            
            // Get the public URL for the avatar
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(profileData.avatar_url);
              
            if (urlData && urlData.publicUrl) {
              setProfilePhotoPreview(urlData.publicUrl);
            } else {
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
      
      // Set the preview and mark that the photo was changed
      setProfilePhotoPreview(result.assets[0].uri);
      setProfilePhotoChanged(true);
      
      // Store the selected image temporarily
      await AsyncStorage.setItem('temp_profile_photo', result.assets[0].uri);
      console.log("Stored temporary profile photo URI");
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert(t('Error'), t('Failed to select image'));
    }
  };

  const handleProfilePhotoUpload = async () => {
    try {
      const tempPhotoUri = await AsyncStorage.getItem('temp_profile_photo');
      if (!tempPhotoUri) return null;
  
      const response = await fetch(tempPhotoUri);
      const blob = await response.blob();
  
      const fileName = `${userId}_${Date.now()}.jpg`;
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob);
  
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
        } catch (photoError) {
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
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>{t('Update Profile')}</Text>

            {/* Profile Photo */}
            <TouchableOpacity
              style={styles.profilePhotoContainer}
              onPress={pickImage}
            >
              {profilePhotoPreview ? (
                <Image
                  source={{ uri: profilePhotoPreview }}
                  style={styles.profilePhoto}
                />
              ) : (
                <View style={styles.defaultAvatarContainer}>
                  <Ionicons name="person-circle" size={100} color="#888" />
                  <Text style={styles.uploadText}>{t('Upload Photo')}</Text>
                </View>
              )}
              <View style={styles.editIconContainer}>
                <Ionicons name="camera" size={24} color="#fff" />
              </View>
            </TouchableOpacity>

            {/* Form Fields */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('Name')}</Text>
              <TextInput
                style={[styles.input, formErrors.name && styles.inputError]}
                placeholder={t('Enter your name')}
                value={formData.name}
                onChangeText={(text) => {
                  updateFormData('name', text);
                  setFormErrors(prev => ({ ...prev, name: null }));
                }}
              />
              {formErrors.name && (
                <Text style={styles.errorText}>{formErrors.name}</Text>
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('Username')}</Text>
              <TextInput
                style={[styles.input, formErrors.username && styles.inputError]}
                placeholder={t('Enter a username')}
                value={formData.username}
                onChangeText={(text) => {
                  updateFormData('username', text);
                  setFormErrors(prev => ({ ...prev, username: null }));
                }}
              />
              {formErrors.username && (
                <Text style={styles.errorText}>{formErrors.username}</Text>
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('Dorm')}</Text>
              <TextInput
                style={[styles.input, formErrors.dormNumber && styles.inputError]}
                placeholder={t('Enter your dorm')}
                value={formData.dormNumber}
                onChangeText={(text) => {
                  updateFormData('dormNumber', text);
                  setFormErrors(prev => ({ ...prev, dormNumber: null }));
                }}
              />
              {formErrors.dormNumber && (
                <Text style={styles.errorText}>{formErrors.dormNumber}</Text>
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('Phone Number')}</Text>
              <TextInput
                style={[styles.input, formErrors.phoneNumber && styles.inputError]}
                placeholder={t('Enter your phone number')}
                value={formData.phoneNumber}
                onChangeText={(text) => {
                  updateFormData('phoneNumber', text);
                  setFormErrors(prev => ({ ...prev, phoneNumber: null }));
                }}
                keyboardType="phone-pad"
              />
              {formErrors.phoneNumber && (
                <Text style={styles.errorText}>{formErrors.phoneNumber}</Text>
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('New Password')} {t('(optional)')}</Text>
              <TextInput
                style={[styles.input, formErrors.password && styles.inputError]}
                placeholder={t('Enter new password')}
                value={formData.password}
                onChangeText={(text) => {
                  updateFormData('password', text);
                  setFormErrors(prev => ({ ...prev, password: null }));
                }}
                secureTextEntry={true}
              />
              {formErrors.password && (
                <Text style={styles.errorText}>{formErrors.password}</Text>
              )}
              <Text style={styles.passwordHint}>
                {t('Leave empty to keep current password')}
              </Text>
            </View>

            {/* Allow Phone Contact */}
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>{t('Allow Phone Contact')}</Text>
              <View style={styles.toggleButtons}>
                <TouchableOpacity
                  style={[
                    styles.toggleOption,
                    formData.allowPhoneContact && styles.toggleOptionSelected
                  ]}
                  onPress={() => updateFormData('allowPhoneContact', true)}
                >
                  <Text style={[
                    styles.toggleText,
                    formData.allowPhoneContact && styles.toggleTextSelected
                  ]}>
                    {t('Yes')}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.toggleOption,
                    !formData.allowPhoneContact && styles.toggleOptionSelected
                  ]}
                  onPress={() => updateFormData('allowPhoneContact', false)}
                >
                  <Text style={[
                    styles.toggleText,
                    !formData.allowPhoneContact && styles.toggleTextSelected
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
                  isSubmitting && styles.buttonDisabled
                ]}
                onPress={handleUpdateProfile}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.buttonText}> {t('Updating')}...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>{t('Update Profile')}</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => navigation.goBack()}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>{t('Cancel')}</Text>
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
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#ff5722',
  },
  profilePhotoContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f5f5f5',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    position: 'relative',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profilePhoto: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  defaultAvatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#ff5722',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    height: 48,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fcfcfc',
  },
  inputError: {
    borderColor: '#ff3b30',
    backgroundColor: '#fff0f0',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  passwordHint: {
    fontSize: 12,
    color: '#888',
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
    color: '#333',
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
    borderColor: '#ddd',
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
  },
  toggleOptionSelected: {
    backgroundColor: '#ff5722',
    borderColor: '#ff5722',
  },
  toggleText: {
    fontSize: 16,
    color: '#555',
    fontWeight: '500',
  },
  toggleTextSelected: {
    color: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  updateButton: {
    backgroundColor: '#ff5722',
    padding: 14,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#ff7a50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#ffb199',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    padding: 14,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#555',
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

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { signUp, createInitialProfile } from '../../services/authService';
import supabase from '../../services/supabaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkNetworkConnection, withNetworkRetry } from '../../utils/networkUtils';
import { validateSignupForm } from '../../utils/validationUtils';
import ErrorBoundaryWrapper from '../../components/ErrorBoundary/ErrorBoundaryWrapper';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';

const SIGNUP_ERROR_CODES = {
  TIMEOUT: 'timeout',
  NETWORK_ERROR: 'network_error',
  EMAIL_IN_USE: 'email_in_use',
  WEAK_PASSWORD: 'weak_password',
  USERNAME_TAKEN: 'username_taken',
  UNKNOWN: 'unknown'
};

const SignUpScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { getThemeColors } = useTheme();
  const colors = getThemeColors();
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phoneNumber: '',
    dormNumber: '',
    password: '',
    confirmPassword: '',
    profilePhoto: null,
    contactByPhone: 'no'
  });
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const updateFormData = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('permissionNeeded'), t('cameraRollPermission'));
      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        
        // Immediately resize the image using ImageManipulator
        const manipResult = await ImageManipulator.manipulateAsync(
          selectedImage.uri,
          [{ resize: { width: 400, height: 400 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        
        
        // Set the RESIZED image
        setProfilePhotoPreview(manipResult.uri);
        updateFormData('profilePhoto', manipResult.uri);
      }
    } catch (error) {
      console.error('Image processing error:', error);
      Alert.alert(t('error'), t('imageProcessingError'));
    }
  };

  const handleSignupError = (error, t, errorType) => {
    console.error('Signup error details:', {
      message: error.message,
      code: error.code,
      details: error?.details,
      type: errorType
    });

    switch (errorType) {
      case SIGNUP_ERROR_CODES.EMAIL_IN_USE:
        setFormErrors({ email: t('emailInUse') });
        break;
      case SIGNUP_ERROR_CODES.USERNAME_TAKEN:
        setFormErrors({ username: t('usernameTaken') });
        break;
      default:
        setError(t('signupError'));
    }
  };

  const handleSignUp = async () => {
    try {
      console.log('=== Starting Signup Process ===');
      setIsSubmitting(true);
      setError(null);
      setFormErrors({});

      // Validation
      const { isValid, errors } = validateSignupForm(formData, t);
      if (!isValid) {
        setFormErrors(errors);
        return;
      }

      // Network check
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        throw new Error('network');
      }

      // Create auth user
      const { data: authData, error: authError } = await signUp(
        formData.email.trim(),
        formData.username.trim(),
        formData.password
      );

      if (authError) {
        if (authError.code === 'email_in_use') {
          setFormErrors({ email: t('emailInUse') });
          return;
        }
        if (authError.code === 'username_taken') {
          setFormErrors({ username: t('usernameTaken') });
          return;
        }
        throw authError;
      }

      const userId = authData.user.id;
      console.log('Auth user created:', userId);

      console.log('Creating profile for user:', userId);
  
      // Create profile
      const { data: profile, error: profileError } = await createInitialProfile(userId, {
        email: formData.email.trim(),
        username: formData.username.trim(),
        name: formData.name.trim(),
        dorm: formData.dormNumber.trim(),
        phone_number: formData.phoneNumber.trim(),
        allow_phone_contact: formData.contactByPhone === 'yes',
        is_admin: false
      });

      if (profileError) {
        console.error('Profile creation failed:', profileError);
        throw profileError;
      }

      console.log('Profile created:', profile);

      // Upload profile photo if exists
      if (formData.profilePhoto) {
        console.log('Uploading profile photo...');
        const photoFileName = `${userId}-${Date.now()}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(photoFileName, {
            uri: formData.profilePhoto,
            type: 'image/jpeg',
            name: photoFileName
          });

        if (uploadError) {
          console.error('Profile photo upload failed:', uploadError);
          // Continue without photo
        } else {
          // Update profile with avatar URL
          const { data: publicUrl } = supabase.storage
            .from('avatars')
            .getPublicUrl(photoFileName);

          const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl.publicUrl })
            .eq('id', userId);

          if (updateError) {
            console.error('Profile photo URL update failed:', updateError);
          }
        }
      }

      // Success alert and navigation
      Alert.alert(
        t('accountCreated'),
        t('checkEmailVerification'),
        [{ 
          text: t('OK'), 
          onPress: () => navigation.reset({ 
            index: 0, 
            routes: [{ name: 'Login' }] 
          }) 
        }]
      );

    } catch (error) {
      console.error('Signup process failed:', error);
      setError(t('signupError'));
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
      loadingMessage={t('signingUp')}
      errorMessage={error}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={[styles.headerSection, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
            <Text style={[styles.title, { color: colors.primary }]}>{t('createAccount')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('joinCommunity')}
            </Text>
          </View>

          {error && (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + '15', borderColor: colors.error }]}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          )}

          {/* Profile Photo Upload */}
          <View style={[styles.profileSection, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('profilePhoto')}</Text>
            <TouchableOpacity
              style={[styles.profilePhotoContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={pickImage}
            >
              {profilePhotoPreview ? (
                <Image
                  source={{ uri: profilePhotoPreview }}
                  style={styles.profilePhoto}
                />
              ) : (
                <View style={styles.profilePhotoPlaceholder}>
                  <View style={[styles.cameraIconContainer, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="camera" size={30} color={colors.primary} />
                  </View>
                  <Text style={[styles.profilePhotoText, { color: colors.textSecondary }]}>{t('uploadProfilePhoto')}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Personal Information Section */}
          <View style={[styles.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('personalInformation')}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('name')}</Text>
              <TextInput
                style={[
                  styles.modernInput, 
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text },
                  formErrors.name && { borderColor: colors.error, backgroundColor: colors.error + '10' }
                ]}
                placeholder={t('name')}
                placeholderTextColor={colors.placeholder}
                value={formData.name}
                onChangeText={(text) => {
                  updateFormData('name', text);
                  setFormErrors(prev => ({ ...prev, name: null }));
                }}
              />
              {formErrors.name && (
                <Text style={[styles.fieldError, { color: colors.error }]}>{formErrors.name}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('username')}</Text>
              <TextInput
                style={[
                  styles.modernInput, 
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text },
                  formErrors.username && { borderColor: colors.error, backgroundColor: colors.error + '10' }
                ]}
                placeholder={t('username')}
                placeholderTextColor={colors.placeholder}
                value={formData.username}
                onChangeText={(text) => {
                  updateFormData('username', text);
                  setFormErrors(prev => ({ ...prev, username: null }));
                }}
                autoCapitalize="none"
              />
              {formErrors.username && (
                <Text style={[styles.fieldError, { color: colors.error }]}>{formErrors.username}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('email')}</Text>
              <TextInput
                style={[
                  styles.modernInput, 
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text },
                  formErrors.email && { borderColor: colors.error, backgroundColor: colors.error + '10' }
                ]}
                placeholder={t('email')}
                placeholderTextColor={colors.placeholder}
                value={formData.email}
                onChangeText={(text) => {
                  updateFormData('email', text);
                  setFormErrors(prev => ({ ...prev, email: null }));
                }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {formErrors.email && (
                <Text style={[styles.fieldError, { color: colors.error }]}>{formErrors.email}</Text>
              )}
            </View>
          </View>

          {/* Contact Information Section */}
          <View style={[styles.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('contactInformation')}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('phoneNumber')}</Text>
              <TextInput
                style={[
                  styles.modernInput, 
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text },
                  formErrors.phoneNumber && { borderColor: colors.error, backgroundColor: colors.error + '10' }
                ]}
                placeholder={t('phoneNumber')}
                placeholderTextColor={colors.placeholder}
                value={formData.phoneNumber}
                onChangeText={(text) => {
                  updateFormData('phoneNumber', text);
                  setFormErrors(prev => ({ ...prev, phoneNumber: null }));
                }}
                keyboardType="phone-pad"
              />
              {formErrors.phoneNumber && (
                <Text style={[styles.fieldError, { color: colors.error }]}>{formErrors.phoneNumber}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('dormNumber')}</Text>
              <TextInput
                style={[
                  styles.modernInput, 
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text },
                  formErrors.dormNumber && { borderColor: colors.error, backgroundColor: colors.error + '10' }
                ]}
                placeholder={t('dormNumber')}
                placeholderTextColor={colors.placeholder}
                value={formData.dormNumber}
                onChangeText={(text) => {
                  updateFormData('dormNumber', text);
                  setFormErrors(prev => ({ ...prev, dormNumber: null }));
                }}
              />
              {formErrors.dormNumber && (
                <Text style={[styles.fieldError, { color: colors.error }]}>{formErrors.dormNumber}</Text>
              )}
            </View>

            {/* Contact Preference Section */}
            <View style={styles.contactPreferenceContainer}>
              <Text style={[styles.contactPreferenceTitle, { color: colors.text }]}>
                {t('allowCall')}
              </Text>
              <View style={styles.contactButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.modernContactButton, 
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    formData.contactByPhone === 'yes' && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => updateFormData('contactByPhone', 'yes')}
                >
                  <Ionicons 
                    name={formData.contactByPhone === 'yes' ? 'checkmark-circle' : 'ellipse-outline'} 
                    size={20} 
                    color={formData.contactByPhone === 'yes' ? colors.headerText : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.modernContactButtonText, 
                    { color: colors.textSecondary },
                    formData.contactByPhone === 'yes' && { color: colors.headerText }
                  ]}>{t('yes')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modernContactButton, 
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    formData.contactByPhone === 'no' && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => updateFormData('contactByPhone', 'no')}
                >
                  <Ionicons 
                    name={formData.contactByPhone === 'no' ? 'checkmark-circle' : 'ellipse-outline'} 
                    size={20} 
                    color={formData.contactByPhone === 'no' ? colors.headerText : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.modernContactButtonText, 
                    { color: colors.textSecondary },
                    formData.contactByPhone === 'no' && { color: colors.headerText }
                  ]}>{t('no')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Security Section */}
          <View style={[styles.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('security')}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('password')}</Text>
              <TextInput
                style={[
                  styles.modernInput, 
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text },
                  formErrors.password && { borderColor: colors.error, backgroundColor: colors.error + '10' }
                ]}
                placeholder={t('password')}
                placeholderTextColor={colors.placeholder}
                value={formData.password}
                onChangeText={(text) => {
                  updateFormData('password', text);
                  setFormErrors(prev => ({ ...prev, password: null }));
                }}
                secureTextEntry
                autoCapitalize="none"
              />
              {formErrors.password && (
                <Text style={[styles.fieldError, { color: colors.error }]}>{formErrors.password}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('confirmPassword')}</Text>
              <TextInput
                style={[
                  styles.modernInput, 
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text },
                  formErrors.confirmPassword && { borderColor: colors.error, backgroundColor: colors.error + '10' }
                ]}
                placeholder={t('confirmPasswordPlaceholder')}
                placeholderTextColor={colors.placeholder}
                value={formData.confirmPassword}
                onChangeText={(text) => {
                  updateFormData('confirmPassword', text);
                  setFormErrors(prev => ({ ...prev, confirmPassword: null }));
                }}
                secureTextEntry
                autoCapitalize="none"
              />
              {formErrors.confirmPassword && (
                <Text style={[styles.fieldError, { color: colors.error }]}>{formErrors.confirmPassword}</Text>
              )}
            </View>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[
              styles.modernSignupButton, 
              { backgroundColor: colors.primary, shadowColor: colors.shadow },
              isSubmitting && { backgroundColor: colors.disabled }
            ]}
            onPress={handleSignUp}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color={colors.headerText} />
                <Text style={[styles.modernSignupButtonText, { color: colors.headerText }]}>
                  {t('creatingAccount')}
                </Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="person-add" size={20} color={colors.headerText} />
                <Text style={[styles.modernSignupButtonText, { color: colors.headerText }]}>
                  {t('signUp')}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={[styles.loginLinkContainer, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
            <Text style={[styles.loginLinkText, { color: colors.textSecondary }]}>
              {t('alreadyHaveAccount')}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              disabled={isSubmitting}
            >
              <Text style={[styles.loginLinkButton, { color: colors.primary }]}>
                {t('login')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <LoadingOverlay
          isVisible={isSubmitting}
          message={t('creatingAccount')}
          onTimeout={() => {
            setIsSubmitting(false);
            setError(t('signupTimeout'));
          }}
        />
      </KeyboardAvoidingView>
    </ErrorBoundaryWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  
  // Header Section
  headerSection: {
    padding: 25,
    borderRadius: 20,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  
  // Error Container
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  errorText: {
    marginLeft: 10,
    fontSize: 14,
    flex: 1,
  },
  
  // Profile Section
  profileSection: {
    padding: 25,
    borderRadius: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  profilePhotoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderStyle: 'dashed',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  profilePhotoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  profilePhotoText: {
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Section Container
  section: {
    padding: 25,
    borderRadius: 20,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  
  // Input Groups
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modernInput: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 15,
    borderWidth: 2,
    fontSize: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Contact Preference
  contactPreferenceContainer: {
    marginTop: 10,
  },
  contactPreferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  contactButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modernContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    flex: 0.48,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modernContactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Sign Up Button
  modernSignupButton: {
    paddingVertical: 18,
    borderRadius: 20,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernSignupButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  
  // Login Link
  loginLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  loginLinkText: {
    fontSize: 16,
    marginRight: 5,
  },
  loginLinkButton: {
    fontSize: 16,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  
  // Error Styles
  fieldError: {
    marginTop: 5,
    fontSize: 14,
    paddingLeft: 5,
  },
});

export default SignUpScreen;
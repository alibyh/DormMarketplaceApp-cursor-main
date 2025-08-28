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
    phoneNumber: '+7',
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateFormData = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Enhanced validation functions
  const validatePhoneNumber = (phone) => {
    // Remove any non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +7, add it
    if (!cleaned.startsWith('+7')) {
      return '+7' + cleaned.replace(/^\+/, '');
    }
    
    return cleaned;
  };

  const formatPhoneNumber = (phone) => {
    // Remove all non-digits except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +7
    let formatted = cleaned;
    if (!formatted.startsWith('+7')) {
      formatted = '+7' + formatted.replace(/^\+/, '');
    }
    
    // Add spaces: +7 XXX XXX XX XX
    const digits = formatted.replace(/\D/g, '');
    if (digits.length >= 2) {
      const countryCode = digits.substring(0, 1);
      const areaCode = digits.substring(1, 4);
      const firstPart = digits.substring(4, 7);
      const secondPart = digits.substring(7, 9);
      const thirdPart = digits.substring(9, 11);
      
      let result = `+${countryCode}`;
      if (areaCode) result += ` ${areaCode}`;
      if (firstPart) result += ` ${firstPart}`;
      if (secondPart) result += ` ${secondPart}`;
      if (thirdPart) result += ` ${thirdPart}`;
      
      return result;
    }
    
    return formatted;
  };

  const validateDormNumber = (dorm) => {
    const num = parseInt(dorm);
    if (isNaN(num) || num < 1 || num > 31) {
      return null;
    }
    return num.toString();
  };

  const handlePhoneNumberChange = (text) => {
    const formatted = formatPhoneNumber(text);
    updateFormData('phoneNumber', formatted);
    setFormErrors(prev => ({ ...prev, phoneNumber: null }));
  };

  const handleDormNumberChange = (text) => {
    // Only allow digits
    const digitsOnly = text.replace(/\D/g, '');
    updateFormData('dormNumber', digitsOnly);
    setFormErrors(prev => ({ ...prev, dormNumber: null }));
  };

  const checkUsernameUniqueness = async (username) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.trim())
        .single();
      
      if (error && error.code === 'PGRST116') {
        // No user found with this username - it's unique
        return true;
      }
      
      if (data) {
        // Username already exists
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking username uniqueness:', error);
      return false;
    }
  };

  const validateAllFields = () => {
    const errors = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = t('nameRequired');
    } else if (formData.name.trim().length < 2) {
      errors.name = t('nameTooShort');
    }

    // Username validation
    if (!formData.username.trim()) {
      errors.username = t('usernameRequired');
    } else if (formData.username.trim().length < 3) {
      errors.username = t('usernameTooShort');
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
      errors.username = t('usernameInvalid');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = t('emailRequired');
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = t('emailInvalid');
    }

    // Phone number validation
    const phoneDigits = formData.phoneNumber.replace(/\D/g, '');
    if (!formData.phoneNumber.trim() || formData.phoneNumber === '+7') {
      errors.phoneNumber = t('phoneRequired');
    } else if (phoneDigits.length !== 11 || !formData.phoneNumber.startsWith('+7')) {
      errors.phoneNumber = t('phoneInvalid');
    }

    // Dorm validation
    const dormNum = parseInt(formData.dormNumber);
    if (!formData.dormNumber.trim()) {
      errors.dormNumber = t('dormRequired');
    } else if (isNaN(dormNum) || dormNum < 1 || dormNum > 31) {
      errors.dormNumber = t('dormInvalid');
    }

    // Password validation
    if (!formData.password) {
      errors.password = t('passwordRequired');
    } else if (formData.password.length < 6) {
      errors.password = t('passwordTooShort');
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = t('confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t('passwordsDoNotMatch');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
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
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        
        // Set the preview immediately (same as UpdateProfileScreen)
        setProfilePhotoPreview(selectedImage.uri);
        updateFormData('profilePhoto', selectedImage.uri);
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

      // Enhanced validation - no data sent unless all fields are correct
      if (!validateAllFields()) {
        setIsSubmitting(false);
        return;
      }

      // Check username uniqueness
      const isUsernameUnique = await checkUsernameUniqueness(formData.username);
      if (!isUsernameUnique) {
        setFormErrors({ username: t('usernameTaken') });
        setIsSubmitting(false);
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

      // Upload profile photo first if exists
      let avatarUrl = null;
      if (formData.profilePhoto) {
        console.log('Uploading profile photo...');
        
        try {
          // Convert the image to binary data using the same method as UpdateProfileScreen
          const fetchResponse = await fetch(formData.profilePhoto);
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

          if (uploadError) {
            console.error('Profile photo upload failed:', uploadError);
            // Continue without photo
          } else {
            // Get the public URL for the uploaded avatar
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(fileName);
            
            if (urlData && urlData.publicUrl) {
              avatarUrl = urlData.publicUrl;
              console.log('Profile photo uploaded successfully:', avatarUrl);
            } else {
              console.error('Failed to get public URL for uploaded photo');
            }
          }
        } catch (photoError) {
          console.error('Error processing profile photo:', photoError);
          // Continue without photo
        }
      }

      // Create profile first (without avatar URL)
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

      // Update profile with avatar URL if photo was uploaded
      if (avatarUrl) {
        console.log('Updating profile with avatar URL:', avatarUrl);
        const { data: updateData, error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', userId)
          .select();

        if (updateError) {
          console.error('Profile avatar update failed:', updateError);
        } else {
          console.log('Profile avatar updated successfully:', updateData);
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
                placeholder="+7 XXX XXX XX XX"
                placeholderTextColor={colors.placeholder}
                value={formData.phoneNumber}
                onChangeText={handlePhoneNumberChange}
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
                onChangeText={handleDormNumberChange}
                keyboardType="numeric"
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
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.modernInput, 
                    styles.passwordInput,
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
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? 'eye-off' : 'eye'} 
                    size={20} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
              {formErrors.password && (
                <Text style={[styles.fieldError, { color: colors.error }]}>{formErrors.password}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('confirmPassword')}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.modernInput, 
                    styles.passwordInput,
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
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons 
                    name={showConfirmPassword ? 'eye-off' : 'eye'} 
                    size={20} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
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
  
  // Password Container
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50, // Space for eye button
  },
  eyeButton: {
    position: 'absolute',
    right: 15,
    top: '42%',
    transform: [{ translateY: -10 }],
    padding: 5,
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
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
  Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
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
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>{t('createAccount')}</Text>
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Profile Photo Upload */}
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
              <View style={styles.profilePhotoPlaceholder}>
                <Ionicons name="camera" size={30} color="#888" />
                <Text style={styles.profilePhotoText}>{t('uploadProfilePhoto')}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TextInput
            style={[styles.input, formErrors.name && styles.inputError]}
            placeholder={t('name')}
            value={formData.name}
            onChangeText={(text) => {
              updateFormData('name', text);
              setFormErrors(prev => ({ ...prev, name: null }));
            }}
          />
          {formErrors.name && (
            <Text style={styles.fieldError}>{formErrors.name}</Text>
          )}

          <TextInput
            style={[styles.input, formErrors.username && styles.inputError]}
            placeholder={t('username')}
            value={formData.username}
            onChangeText={(text) => {
              updateFormData('username', text);
              setFormErrors(prev => ({ ...prev, username: null }));
            }}
            autoCapitalize="none"
          />
          {formErrors.username && (
            <Text style={styles.fieldError}>{formErrors.username}</Text>
          )}

          <TextInput
            style={[styles.input, formErrors.email && styles.inputError]}
            placeholder={t('email')}
            value={formData.email}
            onChangeText={(text) => {
              updateFormData('email', text);
              setFormErrors(prev => ({ ...prev, email: null }));
            }}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {formErrors.email && (
            <Text style={styles.fieldError}>{formErrors.email}</Text>
          )}

          <TextInput
            style={[styles.inputPh, formErrors.phoneNumber && styles.inputError]}
            placeholder={t('phoneNumber')}
            value={formData.phoneNumber}
            onChangeText={(text) => {
              updateFormData('phoneNumber', text);
              setFormErrors(prev => ({ ...prev, phoneNumber: null }));
            }}
            keyboardType="phone-pad"
          />
          {formErrors.phoneNumber && (
            <Text style={styles.fieldError}>{formErrors.phoneNumber}</Text>
          )}

          {/* Contact Preference Section */}
          <View style={styles.contactPreferenceContainer}>
            <Text style={styles.contactPreferenceTitle}>
              {t('allowCall')}
            </Text>
            <TouchableOpacity
              style={[styles.contactButton, formData.contactByPhone === 'yes' && styles.selectedContactButton]}
              onPress={() => updateFormData('contactByPhone', 'yes')}
            >
              <Text style={styles.contactButtonText}>{t('yes')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactButton, formData.contactByPhone === 'no' && styles.selectedContactButton]}
              onPress={() => updateFormData('contactByPhone', 'no')}
            >
              <Text style={styles.contactButtonText}>{t('no')}</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, formErrors.dormNumber && styles.inputError]}
            placeholder={t('dormNumber')}
            value={formData.dormNumber}
            onChangeText={(text) => {
              updateFormData('dormNumber', text);
              setFormErrors(prev => ({ ...prev, dormNumber: null }));
            }}
          />
          {formErrors.dormNumber && (
            <Text style={styles.fieldError}>{formErrors.dormNumber}</Text>
          )}

          <TextInput
            style={[styles.input, formErrors.password && styles.inputError]}
            placeholder={t('password')}
            value={formData.password}
            onChangeText={(text) => {
              updateFormData('password', text);
              setFormErrors(prev => ({ ...prev, password: null }));
            }}
            secureTextEntry
            autoCapitalize="none"
          />
          {formErrors.password && (
            <Text style={styles.fieldError}>{formErrors.password}</Text>
          )}

          <TextInput
            style={[styles.input, formErrors.confirmPassword && styles.inputError]}
            placeholder={t('confirmPassword')}
            value={formData.confirmPassword}
            onChangeText={(text) => {
              updateFormData('confirmPassword', text);
              setFormErrors(prev => ({ ...prev, confirmPassword: null }));
            }}
            secureTextEntry
            autoCapitalize="none"
          />
          {formErrors.confirmPassword && (
            <Text style={styles.fieldError}>{formErrors.confirmPassword}</Text>
          )}

          <TouchableOpacity
            style={[styles.signupButton, isSubmitting && styles.disabledButton]}
            onPress={handleSignUp}
            disabled={isSubmitting}
          >
            <Text style={styles.signupButtonText}>
              {isSubmitting ? t('signingUp') : t('signUp')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.goBack()}
            disabled={isSubmitting}
          >
            <Text style={styles.loginLinkText}>
              {t('alreadyHaveAccount')} {t('login')}
            </Text>
          </TouchableOpacity>
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
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
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
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  profilePhotoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhotoText: {
    marginTop: 10,
    color: '#888',
  },
  input: {
    width: '100%',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputPh: {
    width: '100%',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  signupButton: {
    width: '100%',
    backgroundColor: '#ff5722',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  signupButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginLink: {
    marginTop: 15,
  },
  loginLinkText: {
    color: '#ff5722',
    textAlign: 'center',
  },
  contactPreferenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 7,
  },
  contactPreferenceTitle: {
    fontSize: 17,
    color:'lightslategray',
  },
  contactButton: {
    padding: 7,
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 5,
    marginHorizontal: 5,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  selectedContactButton: {
    backgroundColor: '#ff5722', // Change to your desired color
    borderColor: '#ff5722', // Change to your desired color
  },
  contactButtonText: {
    color: '#333',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  inputError: {
    borderColor: 'red',
  },
  fieldError: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'left',
    width: '100%',
  },
});

export default SignUpScreen;
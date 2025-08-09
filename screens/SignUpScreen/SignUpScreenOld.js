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
import { signUp } from '../../services/authService';
import supabase from '../../services/supabaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkNetworkConnection, withNetworkRetry } from '../../utils/networkUtils';
import { handleSignupError, SIGNUP_ERROR_CODES } from '../../utils/signupErrorHandler';
import { validateSignupForm } from '../../utils/validationUtils';
import ErrorBoundaryWrapper from '../../components/ErrorBoundary/ErrorBoundaryWrapper';

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
        console.log('Selected image URI:', selectedImage.uri);
        
        // Immediately resize the image using ImageManipulator
        console.log('Resizing image...');
        const manipResult = await ImageManipulator.manipulateAsync(
          selectedImage.uri,
          [{ resize: { width: 400, height: 400 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        
        console.log('Image resized to:', manipResult.width, 'x', manipResult.height);
        console.log('Resized image URI:', manipResult.uri);
        
        // Set the RESIZED image
        setProfilePhotoPreview(manipResult.uri);
        updateFormData('profilePhoto', manipResult.uri);
      }
    } catch (error) {
      console.error('Image processing error:', error);
      Alert.alert(t('error'), t('imageProcessingError'));
    }
  };

  const handleSignUp = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      setFormErrors({});

      // Validate form
      const { isValid, errors } = validateSignupForm(formData, t);
      if (!isValid) {
        setFormErrors(errors);
        return;
      }

      // Check network
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        handleSignupError(new Error('network'), t, SIGNUP_ERROR_CODES.NETWORK_ERROR);
        return;
      }

      // Attempt signup with timeout
      const signupPromise = supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: { username: formData.username.trim() },
          emailRedirectTo: 'com.dormmarketplace://login'
        }
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 30000)
      );

      const { data, error } = await Promise.race([signupPromise, timeoutPromise]);

      if (error) {
        const errorType = error.message.includes('email') 
          ? SIGNUP_ERROR_CODES.EMAIL_IN_USE
          : error.message.includes('password')
          ? SIGNUP_ERROR_CODES.WEAK_PASSWORD
          : SIGNUP_ERROR_CODES.UNKNOWN;

        const errorResult = handleSignupError(error, t, errorType);
        if (errorResult?.field) {
          setFormErrors({ [errorResult.field]: errorResult.message });
        }
        return;
      }

      if (!data?.user?.id) {
        setError(t('Failed to create account'));
        return;
      }

      const userId = data.user.id;

      // Step 2: Update profile fields
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: formData.name.trim(),
          username: formData.username.trim(),
          dorm: formData.dormNumber.trim(),
          phone_number: formData.phoneNumber.trim(),
          allow_phone_contact: formData.contactByPhone === 'yes'
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Profile update error:', profileError);
        setError(t('Failed to create profile'));
        return;
      }

      // Step 3: Handle photo upload if exists
      if (formData.profilePhoto) {
        try {
          const fileName = `${userId}.jpg`;
          const fetchResponse = await fetch(formData.profilePhoto);
          
          if (!fetchResponse.ok) {
            throw new Error('Failed to fetch image');
          }

          const arrayBuffer = await fetchResponse.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, uint8Array, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) {
            throw uploadError;
          }

          // Get and update the avatar URL
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

          if (urlData?.publicUrl) {
            await supabase
              .from('profiles')
              .update({ avatar_url: urlData.publicUrl })
              .eq('id', userId);
          }
        } catch (photoError) {
          console.error('Photo upload error:', photoError);
          // Continue with signup even if photo upload fails
        }
      }

      // Important: Force sign out immediately after signup
      await supabase.auth.signOut();
      
      // Clear any stored auth tokens
      await AsyncStorage.removeItem('supabase.auth.token');

      // Show success message and navigate to login
      Alert.alert(
        t('Account Created'),
        t('Please check your email to verify your account before logging in.'),
        [
          {
            text: t('OK'),
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          }
        ],
        { cancelable: false }
      );

    } catch (error) {
      console.error('Signup error:', error);
      
      const errorType = 
        error.message === 'timeout' ? SIGNUP_ERROR_CODES.TIMEOUT :
        error.message === 'network' ? SIGNUP_ERROR_CODES.NETWORK_ERROR :
        SIGNUP_ERROR_CODES.UNKNOWN;

      handleSignupError(error, t, errorType);
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
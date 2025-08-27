import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  SafeAreaView,
  Dimensions // Add this
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Add this
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../../services/supabaseConfig';
import { handleAuthError } from '../../utils/authErrorHandler';
import ErrorBoundaryWrapper from '../../components/ErrorBoundary/ErrorBoundaryWrapper';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay'; // Add this import at the top
import notificationService from '../../services/notificationService';
import { checkPendingDeletion } from '../../services/accountDeletionService';

// Add this near the top of your file, after the imports
const checkNetworkConnection = async () => {
  try {
    const response = await fetch('https://google.com', { 
      method: 'HEAD',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

const LoginScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation(); // Update to include i18n
  const { getThemeColors, currentTheme, changeTheme, THEME_TYPES } = useTheme();
  const colors = getThemeColors();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Add keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check if input is email or username
  const isEmail = (input) => {
    return input.includes('@');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ru' : 'en';
    i18n.changeLanguage(newLang);
  };

  const toggleTheme = () => {
    const newTheme = currentTheme === THEME_TYPES.LIGHT ? THEME_TYPES.DARK : THEME_TYPES.LIGHT;
    changeTheme(newTheme);
  };

  const validateInputs = () => {
    console.log('Validating inputs...');
    if (!emailOrUsername.trim() || !password.trim()) {
      console.log('Validation failed: missing email/username or password');
      setError(t('emailRequired'));
      return false;
    }

    // If input contains @, validate as email
    if (isEmail(emailOrUsername) && !isValidEmail(emailOrUsername)) {
      console.log('Validation failed: invalid email format');
      setError(t('validEmail'));
      return false;
    }

    if (password.length < 6) {
      console.log('Validation failed: password too short');
      setError(t('passwordLength'));
      return false;
    }

    console.log('Validation passed');
    return true;
  };



  const handleLogin = async () => {
    console.log('Login button pressed');
    try {
      setIsLoading(true);
      setError(null);

      // First check for network connectivity
      console.log('Checking network connectivity...');
      const isConnected = await checkNetworkConnection();
      console.log('Network connectivity:', isConnected);
      if (!isConnected) {
        console.log('Network check failed');
        Alert.alert(
          t('No Internet Connection'),
          t('Please check your internet connection and try again.'),
          [{ text: t('ok') }]
        );
        return;
      }
      console.log('Network check passed');
      
      let loginData, loginError;

      if (isEmail(emailOrUsername)) {
        // Login with email
        console.log('Attempting login with email:', emailOrUsername.trim());
        const result = await supabase.auth.signInWithPassword({
          email: emailOrUsername.trim(),
          password: password
        });
        loginData = result.data;
        loginError = result.error;
      } else {
        // Login with username - first get user's email from profiles table
        console.log('Attempting login with username:', emailOrUsername.trim());
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', emailOrUsername.trim())
          .single();

        if (profileError || !profileData?.email) {
          console.log('Username not found or no email associated');
          Alert.alert(
            t('Login Failed'),
            t('Username not found. Please check your username or try logging in with your email.'),
            [{ text: t('ok') }]
          );
          return;
        }

        // Now login with the email
        console.log('Found email for username, attempting login with:', profileData.email);
        const result = await supabase.auth.signInWithPassword({
          email: profileData.email,
          password: password
        });
        loginData = result.data;
        loginError = result.error;
      }

      if (loginError) {
        if (loginError.message === 'Invalid login credentials') {
          Alert.alert(
            t('Login Failed'),
            t('Invalid credentials. Please check your username/email and password.'),
            [{ text: t('ok') }]
          );
        } else if (loginError.message === 'Email not confirmed' || 
                   loginError.code === 'email_not_confirmed') {
          Alert.alert(
            t('emailNotConfirmed'),
            t('emailNotConfirmedMessage'),
            [{ text: t('ok') }]
          );
        } else if (loginError.message?.includes('Network request failed')) {
          Alert.alert(
            t('Connection Error'),
            t('Unable to connect to the server. Please check your internet connection.'),
            [{ text: t('ok') }]
          );
        } else {
          Alert.alert(
            t('error'),
            t('unableToLogin'),
            [{ text: t('ok') }]
          );
        }
        return;
      }

      // Check if account is pending deletion
      if (loginData?.user?.id) {
        const pendingDeletion = await checkPendingDeletion(loginData.user.id);
        if (pendingDeletion?.pending_deletion) {
          // Sign out the user immediately
          await supabase.auth.signOut();
          
          Alert.alert(
            t('accountPendingDeletion'),
            t('accountPendingDeletionMessage'),
            [{ text: t('ok') }]
          );
          return;
        }
      }

      // Save push token to Supabase after successful login
      try {
        console.log('Saving push token after login...');
        await notificationService.saveCurrentToken();
      } catch (tokenError) {
        console.error('Error saving push token after login:', tokenError);
        // Don't fail login if token saving fails
      }

      // Navigate back to the main screen after successful login
      console.log('Resetting navigation to Main screen...');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
      console.log('Navigation reset completed');

    } catch (error) {
      
      // Handle network errors specifically
      if (error.message?.includes('Network request failed')) {
        Alert.alert(
          t('Connection Error'),
          t('Unable to connect to the server. Please check your internet connection.'),
          [{ text: t('ok') }]
        );
      } else {
        Alert.alert(
          t('error'),
          t('unexpectedError'),
          [{ text: t('ok') }]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ErrorBoundaryWrapper
      onRetry={() => setError('')}
      loadingMessage={t('loggingIn')}
      errorMessage={error || t('loginError')}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.topButtonsContainer}>
          <TouchableOpacity 
            style={[styles.topButton, { backgroundColor: colors.card, shadowColor: colors.shadow }]} 
            onPress={toggleLanguage}
            accessibilityLabel={t('changeLanguage')}
          >
            <Ionicons name="language" size={24} color={colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.topButton, { backgroundColor: colors.card, shadowColor: colors.shadow }]} 
            onPress={toggleTheme}
            accessibilityLabel={t('changeTheme')}
          >
            <Ionicons 
              name={currentTheme === THEME_TYPES.LIGHT ? 'moon-outline' : 'sunny-outline'} 
              size={24} 
              color={colors.primary} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.browseButtonContainer}>
          <TouchableOpacity 
            style={[styles.browseButton, { backgroundColor: colors.primary, shadowColor: colors.shadow }]} 
            onPress={() => navigation.navigate('Main')}
            accessibilityLabel={t('browseProducts')}
          >
            <Ionicons name="browsers-outline" size={20} color={colors.headerText} />
            <Text style={[styles.browseButtonText, { color: colors.headerText }]}>{t('browseProducts')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView
              contentContainerStyle={[
                styles.scrollContent,
                isKeyboardVisible && styles.scrollContentWithKeyboard
              ]}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.innerContainer}>
                <View style={styles.logoContainer}>
                  <Image
                    key={currentTheme} // Force re-render when theme changes
                    source={currentTheme === THEME_TYPES.LIGHT 
                      ? require('../../assets/S.F.U.png')
                      : require('../../assets/S.F.U2.png')
                    }
                    style={styles.logo}
                    resizeMode="contain"
                    accessibilityLabel={t('appLogo')}
                  />
                </View>
                <View style={styles.titleContainer}>
                  <Text style={[styles.title, { color: currentTheme === THEME_TYPES.LIGHT ? '#000000' : '#FFFFFF' }]}>u-Shop </Text>
                  <Text style={[styles.title, { color: colors.primary }]}>SFU</Text>
                </View>

                {error ? (
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                ) : null}

                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder={t('emailOrUsernamePlaceholder')}
                  placeholderTextColor={colors.placeholder}
                  value={emailOrUsername}
                  onChangeText={setEmailOrUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="default"
                  accessibilityLabel={t('emailOrUsernameInput')}
                />

                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                    placeholder={t('passwordPlaceholder')}
                    placeholderTextColor={colors.placeholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel={t('passwordInput')}
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

                <TouchableOpacity
                  style={[
                    styles.loginButton, 
                    { backgroundColor: colors.primary, shadowColor: colors.shadow },
                    isLoading && { backgroundColor: colors.disabled }
                  ]}
                  onPress={() => {
                    console.log('Login button pressed');
                    handleLogin();
                  }}
                  disabled={isLoading}
                  accessibilityLabel={t(isLoading ? 'loggingInButton' : 'loginButton')}
                >
                  <Text style={[styles.loginButtonText, { color: colors.headerText }]}>
                    {isLoading ? t('loggingInButton') : t('loginButton')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.navigate('SignUp')}
                  disabled={isLoading}
                  accessibilityLabel={t('signUpButton')}
                >
                  <Text style={[styles.signupText, { color: colors.textSecondary }]}>
                    {t('noAccount')}{t('signUp')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
        <LoadingOverlay
          isVisible={isLoading}
          message={t('loggingIn')}
          onTimeout={() => {
            setIsLoading(false);
            setError(t('loginTimeout'));
          }}
        />
      </SafeAreaView>
    </ErrorBoundaryWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'flex-start', // Changed from 'center' to 'flex-start'
    padding: 20,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start', // Changed from 'center' to 'flex-start'
    paddingTop: Platform.OS === 'ios' ? 70 : 50, // Add padding from top
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 0,
    width: '100%',
    paddingHorizontal: 0,
  },
  logo: {
    width: 300,
    height: 300,
    marginTop: 20, // Add small margin from top
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  input: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    fontSize: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50, // Space for eye button
  },
  eyeButton: {
    position: 'absolute',
    right: 15,
    top: '28%',
    transform: [{ translateY: -10 }],
    padding: 5,
  },
  loginButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
  },
  loginButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  signupText: {
    textAlign: 'center',
    marginTop: 15,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
  },
  scrollContentWithKeyboard: {
    minHeight: Dimensions.get('window').height * 0.5,
  },
  topButtonsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 80 : 20,
    right: 20,
    zIndex: 1000,
    flexDirection: 'row',
    gap: 10,
  },
  topButton: {
    padding: 15,
    borderRadius: 30,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  browseButtonContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 80 : 20,
    left: 20,
    zIndex: 1000,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    gap: 8,
  },
  browseButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;
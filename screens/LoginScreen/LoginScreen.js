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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

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
    if (!email.trim() || !password.trim()) {
      console.log('Validation failed: missing email or password');
      setError(t('emailRequired'));
      return false;
    }

    if (!isValidEmail(email)) {
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
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        console.error('Login error:', error);
        if (error.message === 'Invalid login credentials') {
          Alert.alert(
            t('Login Failed'),
            t('Invalid email or password. Please try again.'),
            [{ text: t('ok') }]
          );
        } else if (error.message?.includes('Network request failed')) {
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

      // Login successful
      console.log('Login successful:', data);
      console.log('User session:', data.session);
      console.log('User:', data.user);
      
      // Navigate back to the main screen after successful login
      console.log('Resetting navigation to Main screen...');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
      console.log('Navigation reset completed');

    } catch (error) {
      console.error('Login error:', error);
      
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
                    source={require('../../assets/S.F.U.png')}
                    style={styles.logo}
                    resizeMode="contain"
                    accessibilityLabel={t('appLogo')}
                  />
                </View>
                <Text style={[styles.title, { color: colors.primary }]}>{t('appTitle')}</Text>

                {error ? (
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                ) : null}

                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder={t('emailPlaceholder')}
                  placeholderTextColor={colors.placeholder}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  accessibilityLabel={t('emailInput')}
                />

                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder={t('passwordPlaceholder')}
                  placeholderTextColor={colors.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel={t('passwordInput')}
                />

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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
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
});

export default LoginScreen;
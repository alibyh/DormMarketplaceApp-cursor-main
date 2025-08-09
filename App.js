// App.js - Complete fix

import React, { useEffect, useRef, useState, useContext } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { UnreadContext } from './context/UnreadContext';
import i18n from './i18n';
import { UnreadProvider } from './context/UnreadContext';
// Import the supabase client directly from config file
import supabase from './services/supabaseConfig';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import ErrorBoundary from './components/ErrorBoundary';
import * as SplashScreen from 'expo-splash-screen';
import { handleAppError } from './utils/appErrorHandler';
import { Image } from 'expo-image';

// Import screens
import LoginScreen from './screens/LoginScreen/LoginScreen';
import SignUpScreen from './screens/SignUpScreen/SignUpScreen';
import HomeScreen from './screens/HomeScreen/HomeScreen';
import AccountScreen from './screens/AccountScreen/AccountScreen';
import ConversationsScreen from './screens/ConversationsScreen/ConversationsScreen';
import ChatScreen from './screens/ChatScreen/ChatScreen';
import ProductDetailsScreen from './screens/ProductDetailsScreen/ProductDetailsScreen';
import PlaceAdScreen from './screens/PlaceAdScreen/PlaceAdScreen';
import EditAdScreen from './screens/EditAdScreen/EditAdScreen';
import UpdateProfileScreen from './screens/UpdateProfileScreen/UpdateProfileScreen';
import BuyOrderDetails from './screens/BuyOrderDetails/BuyOrderDetails';

const VERBOSE_LOGGING = false;
const log = (message) => {
  if (VERBOSE_LOGGING) {
    console.log(message);
  }
};

const LoadingIndicator = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#ff5722" />
  </View>
);

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Create the main tab navigator
function MainTabNavigator() {
  const { t } = useTranslation();
  const { totalUnreadConversations } = useContext(UnreadContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Account') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'PlaceAd') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Conversations') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          }

          return (
            <View>
              <Ionicons name={iconName} size={size} color={color} />
              {route.name === 'Conversations' && totalUnreadConversations > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {totalUnreadConversations > 99 ? '99+' : totalUnreadConversations}
                  </Text>
                </View>
              )}
            </View>
          );
        },
        tabBarActiveTintColor: '#ff5722',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          headerShown: false,
          tabBarLabel: t('home')
        }} 
      />
      <Tab.Screen 
        name="Conversations" 
        component={ConversationsScreen} 
        options={{ 
          headerShown: false,
          tabBarLabel: t('conversations')
        }} 
      />
      <Tab.Screen 
        name="PlaceAd" 
        component={PlaceAdScreen} 
        options={{ 
          headerShown: false,
          tabBarLabel: t('placeAd')
        }} 
      />
      <Tab.Screen 
        name="Account" 
        component={AccountScreen} 
        options={{ 
          headerShown: false,
          tabBarLabel: t('account')
        }} 
      />
    </Tab.Navigator>
  );
}

const App = () => {
  const navigationRef = useRef();
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { t } = useTranslation();

  // Add missing performFullLogout function
  const performFullLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsLoggedIn(false);
    } catch (error) {
      console.error('[App] Logout error:', error);
    }
  };

  // Handle splash screen visibility
  useEffect(() => {
    const hideSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (error) {
        console.error('[App] Error hiding splash screen:', error);
      }
    };

    if (!isLoading && isAuthReady) {
      hideSplash();
    }
  }, [isLoading, isAuthReady]);

  // Initialize app
  useEffect(() => {
    const initApp = async () => {
      try {
        await SplashScreen.preventAutoHideAsync();

        // Check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        console.log('[App] Initial session check:', session ? 'session exists' : 'no session');
        console.log('[App] Setting isLoggedIn to:', !!session);
        setIsLoggedIn(!!session);
        setIsAuthReady(true);
      } catch (error) {
        console.error('[App] Initialization error:', error);
        setIsLoggedIn(false);
        setIsAuthReady(true);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  // 3. Auth state listener
  useEffect(() => {
    const subscription = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[App] Auth state change:', event, session ? 'session exists' : 'no session');
      if (event === 'SIGNED_IN') {
        console.log('[App] User signed in, setting isLoggedIn to true');
        setIsLoggedIn(true);
      }
      if (event === 'SIGNED_OUT') {
        console.log('[App] User signed out, setting isLoggedIn to false');
        setIsLoggedIn(false);
      }
    });

    return () => subscription.data.subscription?.unsubscribe();
  }, []);

  // 4. Session check effect
  useEffect(() => {
    if (!isLoggedIn) return;

    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          throw new Error('session_expired');
        }
      } catch (error) {
        Alert.alert(
          t('sessionExpired'),
          t('pleaseLoginAgain'),
          [{ text: t('ok'), onPress: performFullLogout }]
        );
      }
    };

    const interval = setInterval(checkSession, 60000);
    checkSession();
    return () => clearInterval(interval);
  }, [isLoggedIn, t]);

  // Add this to your App component
  useEffect(() => {
    // Pre-cache common images
    const cacheImages = async () => {
      try {
        await Image.prefetch('https://via.placeholder.com/150');
      } catch (error) {
        console.error('[App] Image caching error:', error);
      }
    };

    cacheImages();
  }, []);

  useEffect(() => {
    // Configure global image caching
    Image.prefetch('https://via.placeholder.com/150');
    
    // Set global image caching options
    Image.cachePolicy = 'memory-disk';
  }, []);

  // Simple loading screen
  if (!isAuthReady || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff5722" />
      </View>
    );
  }

  return (
    <View style={styles.appContainer} testID="app-container">
      <ErrorBoundary>
        <UnreadProvider>
          <I18nextProvider i18n={i18n}>
            <SafeAreaProvider>
              <NavigationContainer
                ref={navigationRef}
                onError={(error) => {
                  console.error('[Navigation] Error:', error);
                  handleAppError(error, 'navigation');
                }}
              >
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                  {/* Always show main app stack */}
                  <Stack.Group>
                    <Stack.Screen name="Main" component={MainTabNavigator} />
                    <Stack.Screen 
                      name="Login" 
                      component={LoginScreen}
                      options={{ animationEnabled: true }}
                    />
                    <Stack.Screen 
                      name="SignUp" 
                      component={SignUpScreen}
                      options={{ animationEnabled: true }}
                    />
                    <Stack.Screen 
                      name="Chat" 
                      component={ChatScreen} 
                      options={({ route }) => ({ 
                        title: route.params?.otherUserName || 'Chat' 
                      })} 
                    />
                    <Stack.Screen 
                      name="ProductDetails" 
                      component={ProductDetailsScreen} 
                      options={{ title: 'Product Details' }} 
                    />
                    <Stack.Screen 
                      name="BuyOrderDetails" 
                      component={BuyOrderDetails} 
                      options={{ 
                        title: 'Want to Buy Details',
                        headerStyle: {
                          backgroundColor: '#104d59',
                        },
                        headerTintColor: '#fff',
                        headerTitleStyle: {
                          fontWeight: 'bold',
                        },
                      }} 
                    />
                    <Stack.Screen 
                      name="PlaceAd" 
                      component={PlaceAdScreen} 
                      options={{ title: 'Place Ad' }} 
                    />
                    <Stack.Screen 
                      name="EditAd" 
                      component={EditAdScreen} 
                      options={{ title: 'Edit Ad' }} 
                    />
                    <Stack.Screen 
                      name="UpdateProfile" 
                      component={UpdateProfileScreen} 
                      options={{ title: 'Update Profile' }} 
                    />
                  </Stack.Group>
                </Stack.Navigator>
              </NavigationContainer>
            </SafeAreaProvider>
          </I18nextProvider>
        </UnreadProvider>
      </ErrorBoundary>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff', // Explicit background color
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingText: {
    marginTop: 10,
    color: '#000000',
    fontSize: 16,
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#ffffff', // Explicit background color
  },
  tabBadge: {
    position: 'absolute',
    right: -6,
    top: -4,
    backgroundColor: '#ff5722',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  }
});

export default App;

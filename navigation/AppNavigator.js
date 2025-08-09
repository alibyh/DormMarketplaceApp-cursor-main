// navigation/AppNavigator.js

import React, { useContext, useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { UnreadContext } from '../context/UnreadContext'; // Import UnreadContext
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseClient'; // Ensure this path is correct
import { StyleSheet, View, Image, Text, TouchableOpacity } from 'react-native'; // Import StyleSheet

// Add this after imports
const getAvatarUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return supabase.storage
    .from('avatars')
    .getPublicUrl(url)?.data?.publicUrl;
};

// Import your screens
import UpdateProfileScreen from '../screens/UpdateProfileScreen/UpdateProfileScreen';
import LoginScreen from '../screens/LoginScreen/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen/SignUpScreen';
import HomeScreen from '../screens/HomeScreen/HomeScreen';
import AccountScreen from '../screens/AccountScreen/AccountScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen/ProductDetailsScreen';
import BuyOrderDetails from '../screens/BuyOrderDetails/BuyOrderDetails'; // Update this import
import PlaceAdScreen from '../screens/PlaceAdScreen/PlaceAdScreen';
import EditAdScreen from '../screens/EditAdScreen/EditAdScreen';
import ChatScreen from '../screens/ChatScreen/ChatScreen';
import ConversationsScreen from '../screens/ConversationsScreen/ConversationsScreen'; // Ensure this path is correct

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator
const TabNavigator = () => {
  const { t } = useTranslation();
  const { totalUnreadConversations } = useContext(UnreadContext); // Consume the context

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Configure tab bar icons
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Conversations':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'PlaceAd':
              iconName = focused ? 'add-circle' : 'add-circle-outline';
              break;
            case 'Account':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#ff5722',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: t('home') }}
      />
      <Tab.Screen
        name="Conversations"
        component={ConversationsScreen}
        options={{
          title: t('conversations'),
          
          tabBarBadge: totalUnreadConversations > 0 ? totalUnreadConversations : undefined, // Display badge
        }}
      />
      <Tab.Screen
        name="PlaceAd"
        component={PlaceAdScreen}
        options={{ title: t('placeAd') }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{ title: t('account') }}
      />
    </Tab.Navigator>
  );
};

// Main App Stack Navigator
const AppNavigator = () => {
  const { t } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      const sessionStr = await AsyncStorage.getItem('supabase.auth.token');
      setIsLoggedIn(!!sessionStr);
    };
    
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      if (event === 'SIGNED_IN') {
        setIsLoggedIn(true);
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <Stack.Navigator 
      initialRouteName="Login"
      screenOptions={{ 
        headerShown: true,
        headerStyle: {
          backgroundColor: '#104d59',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        cardStyle: { backgroundColor: '#f5f5f5' },
      }}
    >
      {!isLoggedIn ? (
        // Auth Stack
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      ) : (
        // Main App Stack
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={({ route, navigation }) => ({
              headerShown: true,
              gestureEnabled: true,
              animation: 'slide_from_right',
              headerLeft: () => (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
              ),
              headerTitle: () => (
                <View style={styles.headerTitle}>
                  <Image
                    source={
                      route.params?.otherUserProfile?.avatar_url
                        ? { uri: getAvatarUrl(route.params.otherUserProfile.avatar_url) }
                        : require('../assets/default-avatar.png')
                    }
                    style={styles.headerAvatar}
                    defaultSource={require('../assets/default-avatar.png')}
                  />
                  <Text style={styles.headerText}>
                    {route.params?.otherUserProfile?.username || 'Chat'}
                  </Text>
                </View>
              ),
              headerRight: () => (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => {
                    if (route.params?.productId) {
                      navigation.navigate('ProductDetails', {
                        productId: route.params.productId,
                        sellerId: route.params.otherUserProfile?.id
                      });
                    }
                  }}
                  disabled={!route.params?.productId}
                >
                  <Ionicons 
                    name="information-circle-outline" 
                    size={24} 
                    color={route.params?.productId ? '#fff' : '#ffffff80'} 
                  />
                </TouchableOpacity>
              ),
              headerStyle: {
                backgroundColor: '#104d59',
                elevation: 2,
                shadowOpacity: 0.3,
                shadowOffset: { width: 0, height: 2 },
              },
            })}
          />
          <Stack.Screen
            name="ProductDetails"
            component={ProductDetailsScreen}
            options={{
              headerShown: true,
              title: t('productDetails'),
            }}
          />
          <Stack.Screen
            name="BuyOrderDetails"
            component={BuyOrderDetails}
            options={{
              headerShown: true,
              title: t('wantToBuyDetails'),
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
            name="UpdateProfileScreen"
            component={UpdateProfileScreen}
            options={{
              headerShown: true,
              title: t('updateProfile'),
              headerStyle: {
                backgroundColor: '#ff5722',
              },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen
            name="EditAd"
            component={EditAdScreen}
            options={{ 
              headerShown: true,
              title: t('editAd') 
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 10,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: '#e1e1e1',
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  headerButton: {
    padding: 8,
    marginHorizontal: 4,
  },
});

export default AppNavigator;

// In the component where you navigate to Chat
navigation.navigate('Chat', {
  conversationId,
  otherUserProfile: {
    id: otherUser.id,
    username: otherUser.username,
    avatar_url: otherUser.avatar_url
  },
  productId: productId // if available
});

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen/HomeScreen';
import AccountScreen from '../screens/AccountScreen/AccountScreen';
import LoginScreen from '../screens/LoginScreen/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen/SignUpScreen';
import { Ionicons } from '@expo/vector-icons';
import ChatScreen from '../screens/ChatScreen/ChatScreen';
import PlaceAdScreen from '../screens/PlaceAdScreen/PlaceAdScreen';
import { View, Text, StyleSheet } from 'react-native';
import { useContext } from 'react';
import { UnreadContext } from '../context/UnreadContext';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { totalUnreadConversations } = useContext(UnreadContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return (
            <View>
              <Ionicons name={iconName} size={size} color={color} />
              {route.name === 'Messages' && totalUnreadConversations > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>
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
      <Tab.Screen name="Login" component={LoginScreen} />
      <Tab.Screen name="SignUp" component={SignUpScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Messages" component={ChatScreen} />
      <Tab.Screen name="Place Ad" component={PlaceAdScreen} />
      <Tab.Screen name="Profile" component={AccountScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: '#ff5722',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  }
});

export default TabNavigator;
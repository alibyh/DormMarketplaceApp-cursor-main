import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define theme types
export const THEME_TYPES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

// Define theme colors
export const THEMES = {
  light: {
    name: 'light',
    primary: '#ff5722',
    primary2: 'white',  // for buttons
    secondary: '#104d59',
    background: '#ffffff',
    surface: '#f8f9fa',
    text: '#333333',
    textSecondary: '#666666',
    border: '#e0e0e0',
    card: '#ffffff',
    error: '#ff3b30',
    success: '#4caf50',
    warning: '#ff9800',
    info: '#2196f3',
    placeholder: '#999999',
    disabled: '#cccccc',
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.5)',
    // Specific component colors
    headerBackground: '#104d59',
    headerText: '#ffffff',
    tabBarBackground: '#ffffff',
    tabBarActive: '#ff5722',
    tabBarInactive: '#999999',
    buttonPrimary: '#ff5722',
    buttonSecondary: '#104d59',
    inputBackground: '#f8f9fa',
    inputBorder: '#e0e0e0',
    modalBackground: '#ffffff',
    modalOverlay: 'rgba(0, 0, 0, 0.5)',
  },
  dark: {
    name: 'dark',
    primary: '#ff5722',
    primary2: 'ff5722',  // for buttons
    secondary: '#104d59',
    background: '#2b2b2b',
    surface: '#1e1e1e',
    text: '#ffffff',
    textSecondary: '#b0b0b0',
    border: '#333333',
    card: '#242424',
    error: '#ff6b6b',
    success: '#51cf66',
    warning: '#ffd43b',
    info: '#74c0fc',
    placeholder: '#666666',
    disabled: '#444444',
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.7)',
    // Specific component colors
    headerBackground: '#1e1e1e',
    headerText: '#ffffff',
    tabBarBackground: '#1e1e1e',
    tabBarActive: '#ff5722',
    tabBarInactive: '#666666',
    buttonPrimary: '#ff5722',
    buttonSecondary: '#104d59',
    inputBackground: '#2d2d2d',
    inputBorder: '#444444',
    modalBackground: '#1e1e1e',
    modalOverlay: 'rgba(0, 0, 0, 0.7)',
  }
};

// Create theme context
const ThemeContext = createContext();

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(THEME_TYPES.LIGHT);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme on app start
  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('userTheme');
      if (savedTheme && Object.values(THEME_TYPES).includes(savedTheme)) {
        setCurrentTheme(savedTheme);
      }
    } catch (error) {
      console.error('Error loading saved theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeTheme = async (themeType) => {
    try {
      if (Object.values(THEME_TYPES).includes(themeType)) {
        setCurrentTheme(themeType);
        await AsyncStorage.setItem('userTheme', themeType);
      }
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  // Get current theme colors
  const getThemeColors = () => {
    if (currentTheme === THEME_TYPES.SYSTEM) {
      // For now, default to light theme for system
      // In a real implementation, you'd detect system theme
      return THEMES.light;
    }
    return THEMES[currentTheme] || THEMES.light;
  };

  const value = {
    currentTheme,
    changeTheme,
    getThemeColors,
    isLoading,
    THEME_TYPES,
    THEMES
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;

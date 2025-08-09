import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  BlurView,
  Platform,
} from 'react-native';
import { BlurView as ExpoBlurView } from 'expo-blur';

const TIMEOUT_DURATION = 15000; // 15 seconds timeout

const LoadingOverlay = ({ isVisible, message, onTimeout }) => {
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    let timeoutId;
    if (isVisible) {
      setShowTimeout(false);
      timeoutId = setTimeout(() => {
        setShowTimeout(true);
        onTimeout?.();
      }, TIMEOUT_DURATION);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isVisible, onTimeout]);

  if (!isVisible) return null;

  const BlurComponent = Platform.OS === 'ios' ? ExpoBlurView : View;

  return (
    <View style={styles.container}>
      <BlurComponent
        style={styles.blurView}
        intensity={50}
        tint="dark"
      >
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#ff5722" />
          <Text style={styles.message}>
            {showTimeout ? 'Taking too long. Please try again.' : message}
          </Text>
        </View>
      </BlurComponent>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'android' ? 'rgba(0, 0, 0, 0.5)' : undefined,
  },
  content: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    maxWidth: '80%',
  },
  message: {
    marginTop: 10,
    color: '#333',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default LoadingOverlay;
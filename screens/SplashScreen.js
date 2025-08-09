import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Image } from 'react-native';

const SplashScreen = () => {
  return (
    <View style={styles.container}>
      {/* Add your app logo or image here */}
      <Text style={styles.title}>Dorm Marketplace</Text>
      <ActivityIndicator size="large" color="#ff5722" style={styles.spinner} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ff5722',
    marginBottom: 20,
  },
  spinner: {
    marginTop: 20,
  }
});

export default SplashScreen; 
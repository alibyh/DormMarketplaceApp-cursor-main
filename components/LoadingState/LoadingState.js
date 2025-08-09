import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

const LoadingState = ({ message }) => {
  const { t } = useTranslation();
  
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#104d59" />
      <Text style={styles.text}>{message || t('loading')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  }
});

export default LoadingState;
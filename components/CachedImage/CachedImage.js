import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View, ActivityIndicator } from 'react-native';

const CachedImage = ({ source, style, contentFit = 'cover' }) => {
  const [isLoading, setIsLoading] = React.useState(true);

  return (
    <View style={[styles.container, style]}>
      {isLoading && (
        <ActivityIndicator 
          style={styles.loader} 
          size="small" 
          color="#ff5722" 
        />
      )}
      <Image
        source={source}
        style={[style, isLoading && styles.hiddenImage]}
        contentFit={contentFit}
        transition={200}
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => setIsLoading(false)}
        cachePolicy="memory-disk"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    position: 'absolute',
  },
  hiddenImage: {
    opacity: 0,
  },
});

export default CachedImage;
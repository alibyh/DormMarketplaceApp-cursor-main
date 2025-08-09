import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

const BannerCarousel = () => {
  return (
    <View style={styles.carousel}>
      {/* Replace with actual images */}
      <Image source={{ uri: '/Users/user/dormsApp/DormMarketplaceApp/assets/banner1.jpg' }} style={styles.image} />
    </View>
  );
};

const styles = StyleSheet.create({
  carousel: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  bannerText: {
    position: 'absolute',
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default BannerCarousel;
// components/YandexBanner/YandexNativeAd.js
import { NativeModules, Platform, requireNativeComponent } from 'react-native';

// Try to import the native component
let YandexBannerView;
try {
  YandexBannerView = requireNativeComponent('YandexBannerView');
} catch (error) {
  console.error('Failed to load YandexBannerView native component:', error);
}

// Fallback implementation if native component is not available
const FallbackBannerView = ({ style, adUnitId, onAdLoaded, onAdFailedToLoad }) => {
  return null; // Return nothing in fallback mode
};

// Export the component that should be used
export default YandexBannerView || FallbackBannerView;
// modules/yandex-ads/index.js
import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'yandex-ads' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// Get the native module
const YandexAdsModule = NativeModules.YandexAdsModule
  ? NativeModules.YandexAdsModule
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

// Export the module methods
export function initializeYandexAds() {
  return YandexAdsModule.initialize();
}

export function showBanner(adUnitId, options = {}) {
  return YandexAdsModule.showBanner(adUnitId, options);
}

export function hideBanner() {
  return YandexAdsModule.hideBanner();
}

export function loadInterstitial(adUnitId) {
  return YandexAdsModule.loadInterstitial(adUnitId);
}

export function showInterstitial() {
  return YandexAdsModule.showInterstitial();
}

export function isInterstitialLoaded() {
  return YandexAdsModule.isInterstitialLoaded();
}

export function loadRewarded(adUnitId) {
  return YandexAdsModule.loadRewarded(adUnitId);
}

export function showRewarded() {
  return YandexAdsModule.showRewarded();
}

export function isRewardedLoaded() {
  return YandexAdsModule.isRewardedLoaded();
}

export default {
  initializeYandexAds,
  showBanner,
  hideBanner,
  loadInterstitial,
  showInterstitial,
  isInterstitialLoaded,
  loadRewarded,
  showRewarded,
  isRewardedLoaded,
};

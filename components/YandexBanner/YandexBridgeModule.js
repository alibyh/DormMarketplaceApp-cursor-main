import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

class YandexAdsBridge {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('Initializing Yandex Ads bridge...');
    if (!NativeModules.YandexAdsModule) {
      throw new Error('YandexAdsModule is not available. Make sure native setup is correct.');
    }

    try {
      await NativeModules.YandexAdsModule.initializeSDK();
      this.isInitialized = true;
      console.log('Yandex Ads bridge initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Yandex Ads:', error);
      throw error;
    }
  }

  async loadBanner(adUnitId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await NativeModules.YandexAdsModule.loadBanner(adUnitId);
    } catch (error) {
      console.error('Failed to load banner:', error);
      throw error;
    }
  }
}

export default new YandexAdsBridge();
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

// Enhanced YandexAdsBridge with better error handling and logging
class YandexAdsBridge {
  constructor() {
    this.isInitialized = false;
    this.module = NativeModules.YandexAdsModule;
    
    // Create event emitter if module exists
    if (this.module) {
      this.eventEmitter = new NativeEventEmitter(this.module);
      this.listeners = {};
    }
    
    console.log('[YandexAdsBridge] Constructed with module:', !!this.module);
  }

  // Check if the native module is available
  isAvailable() {
    return !!this.module;
  }

  // Initialize the SDK
  async initialize() {
    if (this.isInitialized) {
      console.log('[YandexAdsBridge] Already initialized, skipping');
      return;
    }

    console.log('[YandexAdsBridge] Initializing Yandex Ads SDK...');
    
    if (!this.module) {
      console.error('[YandexAdsBridge] YandexAdsModule is not available');
      throw new Error('YandexAdsModule is not available. Make sure native setup is correct.');
    }

    try {
      if (typeof this.module.initializeSDK === 'function') {
        await this.module.initializeSDK();
        this.isInitialized = true;
        console.log('[YandexAdsBridge] Yandex Ads SDK initialized successfully');
      } else {
        console.error('[YandexAdsBridge] initializeSDK method not found');
        throw new Error('initializeSDK method not found on YandexAdsModule');
      }
    } catch (error) {
      console.error('[YandexAdsBridge] Failed to initialize Yandex Ads:', error);
      throw error;
    }
  }

  // Load a banner ad
  async loadBanner(adUnitId) {
    console.log('[YandexAdsBridge] Loading banner with ID:', adUnitId);
    
    if (!this.isInitialized) {
      console.log('[YandexAdsBridge] Not initialized, initializing first');
      await this.initialize();
    }

    try {
      if (typeof this.module.loadBanner === 'function') {
        await this.module.loadBanner(adUnitId);
        console.log('[YandexAdsBridge] Banner loaded successfully');
      } else {
        console.error('[YandexAdsBridge] loadBanner method not found');
        throw new Error('loadBanner method not found on YandexAdsModule');
      }
    } catch (error) {
      console.error('[YandexAdsBridge] Failed to load banner:', error);
      throw error;
    }
  }
  
  // Add event listener
  addListener(eventType, listener) {
    if (!this.eventEmitter) return { remove: () => {} };
    
    const subscription = this.eventEmitter.addListener(eventType, listener);
    this.listeners[eventType] = this.listeners[eventType] || [];
    this.listeners[eventType].push(subscription);
    
    return subscription;
  }
  
  // Remove all listeners
  removeAllListeners() {
    if (!this.eventEmitter) return;
    
    Object.values(this.listeners).forEach(subscriptions => {
      subscriptions.forEach(subscription => subscription.remove());
    });
    
    this.listeners = {};
  }
}

// Export a singleton instance
export default new YandexAdsBridge();
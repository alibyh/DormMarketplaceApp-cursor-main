import YandexMobileAdsModule from '../YandexMobileAdsModule';
import { isSupportedPlatform } from '../util';
import { AppOpenAd } from './AppOpenAd';

/**
 * This class is responsible for loading an AppOpen ad.
 */
export class AppOpenAdLoader {
  /**
   * Private constructor to prevent direct instantiation.
   * Use AppOpenAdLoader.create() instead.
   */
  constructor(id) {
    this._id = id;
  }

  /**
   * Creates a new instance of AppOpenAdLoader.
   *
   * @returns {Promise<AppOpenAdLoader>} A promise that either resolves to an AppOpenAdLoader or rejects with an error.
   */
  static async create() {
    try {
      isSupportedPlatform();
      const id = await YandexMobileAdsModule.YandexAppOpenAdModule.newLoader();
      return new AppOpenAdLoader(id);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Starts loading an appOpen ad with the specified AdRequestConfiguration.
   *
   * @param {AdRequestConfiguration} adRequestConfiguration AdRequestConfiguration.
   *
   * @returns {Promise<AppOpenAd>} A promise that either resolves to an AppOpenAd or rejects with an error.
   */
  async loadAd(adRequestConfiguration) {
    try {
      isSupportedPlatform();
      if (!this._id || this._id === '') {
        throw new Error('Loader is not initialized');
      }
      const adId = await YandexMobileAdsModule.YandexAppOpenAdModule.loadAd(this._id, adRequestConfiguration);
      const appOpenAd = await AppOpenAd.create(adId);
      return appOpenAd;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Cancels active loading of the AppOpen Ad.
   *
   * @returns {Promise<void>} A promise that either resolves with no value or rejects with an error.
   */
  async cancelLoading() {
    try {
      isSupportedPlatform();
      if (!this._id || this._id === '') {
        throw new Error('Loader is not initialized');
      }
      await YandexMobileAdsModule.YandexAppOpenAdModule.cancelLoading(this._id);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
//# sourceMappingURL=AppOpenAdLoader.js.map
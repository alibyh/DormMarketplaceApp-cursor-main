import YandexMobileAdsModule from '../YandexMobileAdsModule';
import { isSupportedPlatform } from '../util';
import { InterstitialAd } from './InterstitialAd';

/**
 * This class is responsible for loading an Interstitial Ad.
 */
export class InterstitialAdLoader {
  /**
   * Private constructor to prevent direct instantiation.
   * Use InterstitialAdLoader.create() instead.
   */
  constructor(id) {
    this._id = id;
  }

  /**
   * Creates a new instance of InterstitialAdLoader.
   *
   * @returns {Promise<InterstitialAdLoader>} A promise that either resolves to an InterstitialAdLoader or rejects with an error.
   */
  static async create() {
    try {
      isSupportedPlatform();
      const id = await YandexMobileAdsModule.YandexInterstitialAdModule.newLoader();
      return new InterstitialAdLoader(id);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Starts loading an interstitial ad with the specified AdRequestConfiguration.
   *
   * @param {AdRequestConfiguration} adRequestConfiguration AdRequestConfiguration.
   *
   * @returns {Promise<InterstitialAd>} A promise that either resolves to an InterstitialAd or rejects with an error.
   */
  async loadAd(adRequestConfiguration) {
    try {
      isSupportedPlatform();
      if (!this._id || this._id === '') {
        throw new Error('Loader is not initialized');
      }
      const adId = await YandexMobileAdsModule.YandexInterstitialAdModule.loadAd(this._id, adRequestConfiguration);
      const interstitialAd = await InterstitialAd.create(adId);
      return interstitialAd;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Cancels active loading of the Interstitial Ad.
   *
   * @returns {Promise<void>} A promise that either resolves with no value or rejects with an error.
   */
  async cancelLoading() {
    try {
      isSupportedPlatform();
      if (!this._id || this._id === '') {
        throw new Error('Loader is not initialized');
      }
      await YandexMobileAdsModule.YandexInterstitialAdModule.cancelLoading(this._id);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
//# sourceMappingURL=InterstitialAdLoader.js.map
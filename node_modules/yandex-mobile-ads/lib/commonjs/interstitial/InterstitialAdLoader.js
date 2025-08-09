"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.InterstitialAdLoader = void 0;
var _YandexMobileAdsModule = _interopRequireDefault(require("../YandexMobileAdsModule"));
var _util = require("../util");
var _InterstitialAd = require("./InterstitialAd");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * This class is responsible for loading an Interstitial Ad.
 */
class InterstitialAdLoader {
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
      (0, _util.isSupportedPlatform)();
      const id = await _YandexMobileAdsModule.default.YandexInterstitialAdModule.newLoader();
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
      (0, _util.isSupportedPlatform)();
      if (!this._id || this._id === '') {
        throw new Error('Loader is not initialized');
      }
      const adId = await _YandexMobileAdsModule.default.YandexInterstitialAdModule.loadAd(this._id, adRequestConfiguration);
      const interstitialAd = await _InterstitialAd.InterstitialAd.create(adId);
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
      (0, _util.isSupportedPlatform)();
      if (!this._id || this._id === '') {
        throw new Error('Loader is not initialized');
      }
      await _YandexMobileAdsModule.default.YandexInterstitialAdModule.cancelLoading(this._id);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
exports.InterstitialAdLoader = InterstitialAdLoader;
//# sourceMappingURL=InterstitialAdLoader.js.map
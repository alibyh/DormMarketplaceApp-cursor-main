"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AppOpenAdLoader = void 0;
var _YandexMobileAdsModule = _interopRequireDefault(require("../YandexMobileAdsModule"));
var _util = require("../util");
var _AppOpenAd = require("./AppOpenAd");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * This class is responsible for loading an AppOpen ad.
 */
class AppOpenAdLoader {
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
      (0, _util.isSupportedPlatform)();
      const id = await _YandexMobileAdsModule.default.YandexAppOpenAdModule.newLoader();
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
      (0, _util.isSupportedPlatform)();
      if (!this._id || this._id === '') {
        throw new Error('Loader is not initialized');
      }
      const adId = await _YandexMobileAdsModule.default.YandexAppOpenAdModule.loadAd(this._id, adRequestConfiguration);
      const appOpenAd = await _AppOpenAd.AppOpenAd.create(adId);
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
      (0, _util.isSupportedPlatform)();
      if (!this._id || this._id === '') {
        throw new Error('Loader is not initialized');
      }
      await _YandexMobileAdsModule.default.YandexAppOpenAdModule.cancelLoading(this._id);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
exports.AppOpenAdLoader = AppOpenAdLoader;
//# sourceMappingURL=AppOpenAdLoader.js.map
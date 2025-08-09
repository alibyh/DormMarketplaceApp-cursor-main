"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RewardedAdLoader = void 0;
var _YandexMobileAdsModule = _interopRequireDefault(require("../YandexMobileAdsModule"));
var _util = require("../util");
var _RewardedAd = require("./RewardedAd");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * This class is responsible for loading a Rewarded Ad.
 */
class RewardedAdLoader {
  /**
   * Private constructor to prevent direct instantiation.
   * Use RewardedAdLoader.create() instead.
   */
  constructor(id) {
    this._id = id;
  }

  /**
   * Creates a new instance of RewardedAdLoader.
   *
   * @returns {Promise<RewardedAdLoader>} A promise that either resolves to a RewardedAdLoader or rejects with an error.
   */
  static async create() {
    try {
      (0, _util.isSupportedPlatform)();
      const id = await _YandexMobileAdsModule.default.YandexRewardedAdModule.newLoader();
      return new RewardedAdLoader(id);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Starts loading a rewarded ad with the specified AdRequestConfiguration.
   *
   * @param {AdRequestConfiguration} adRequestConfiguration AdRequestConfiguration.
   *
   * @returns {Promise<RewardedAd>} A promise that either resolves to a RewardedAd or rejects with an error.
   */
  async loadAd(adRequestConfiguration) {
    try {
      (0, _util.isSupportedPlatform)();
      if (!this._id || this._id === '') {
        throw new Error('Loader is not initialized');
      }
      const adId = await _YandexMobileAdsModule.default.YandexRewardedAdModule.loadAd(this._id, adRequestConfiguration);
      const rewardedAd = await _RewardedAd.RewardedAd.create(adId);
      return rewardedAd;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Cancels active loading of the Rewarded Ad.
   *
   * @returns {Promise<void>} A promise that either resolves with no value or rejects with an error.
   */
  async cancelLoading() {
    try {
      (0, _util.isSupportedPlatform)();
      if (!this._id || this._id === '') {
        throw new Error('Loader is not initialized');
      }
      await _YandexMobileAdsModule.default.YandexRewardedAdModule.cancelLoading(this._id);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
exports.RewardedAdLoader = RewardedAdLoader;
//# sourceMappingURL=RewardedAdLoader.js.map
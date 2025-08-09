"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AppOpenAd = void 0;
var _util = require("../util");
var _YandexMobileAdsModule = _interopRequireDefault(require("../YandexMobileAdsModule"));
var _reactNative = require("react-native");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * This class is responsible for showing an app open ad.
 */
class AppOpenAd {
  _subscriptions = [];
  constructor(adId) {
    this._id = adId;
    this._eventEmitter = new _reactNative.NativeEventEmitter(_reactNative.NativeModules.YandexEventEmitter);
    this._subscriptions.push(this._eventEmitter.addListener('RNYandexMobileAds-AppOpen-onAdDeleted', () => {
      return this.delete();
    }));
  }

  /**
   * Creates a new instance of AppOpenAd.
   *
   * @returns {Promise<AppOpenAd>} A promise that either resolves to an AppOpenAd or rejects with an error.
   */
  static async create(adId) {
    try {
      (0, _util.isSupportedPlatform)();
      return new AppOpenAd(adId);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Sets the callback function that will be called after the ad shows.
   *
   * @param {() => void} onAdShown_ The callback function that will be called after the ad shows.
   */
  set onAdShown(onAdShown_) {
    this._onAdShown = onAdShown_;
    if (this._onAdShown !== null) {
      this._subscriptions.push(this._eventEmitter.addListener('RNYandexMobileAds-AppOpen-onAdShown', this.createListenerFunction(this._onAdShown)));
    }
  }

  /**
   * Sets the callback function that will be called if the ad can’t be displayed.
   *
   * @param {(error?: AdError) => void} onAdFailedToShow_ The callback function that will be called if the ad can’t be displayed.
   */
  set onAdFailedToShow(onAdFailedToShow_) {
    this._onAdFailedToShow = onAdFailedToShow_;
    if (this._onAdFailedToShow != null) {
      this._subscriptions.push(this._eventEmitter.addListener('RNYandexMobileAds-AppOpen-onAdFailedToShow', this.createListenerFunction(event => {
        var _this$_onAdFailedToSh;
        return (_this$_onAdFailedToSh = this._onAdFailedToShow) === null || _this$_onAdFailedToSh === void 0 ? void 0 : _this$_onAdFailedToSh.call(this, event.error);
      })));
    }
  }

  /**
   * Sets the callback function that will be called after dismissing the ad.
   *
   * @param {() => void} onAdDismissed_ The callback function that will be called after dismissing the ad.
   */
  set onAdDismissed(onAdDismissed_) {
    this._onAdDismissed = onAdDismissed_;
    if (this._onAdDismissed != null) {
      this._subscriptions.push(this._eventEmitter.addListener('RNYandexMobileAds-AppOpen-onAdDismissed', this.createListenerFunction(this._onAdDismissed)));
    }
  }

  /**
   * Sets the callback function that will be called when the user clicks on the ad.
   *
   * @param {() => void} onAdClicked_ The callback function that will be called when the user clicks on the ad.
   */
  set onAdClicked(onAdClicked_) {
    this._onAdClicked = onAdClicked_;
    if (this._onAdClicked !== null) {
      this._subscriptions.push(this._eventEmitter.addListener('RNYandexMobileAds-AppOpen-onAdClicked', this.createListenerFunction(this._onAdClicked)));
    }
  }

  /**
   * Sets the callback function that will be called when an impression is tracked.
   *
   * @param {(impressionData?: ImpressionData) => void} onAdImpression_ The callback function that will be called when an impression is tracked.
   */
  set onAdImpression(onAdImpression_) {
    this._onAdImpression = onAdImpression_;
    if (this._onAdImpression !== null) {
      this._subscriptions.push(this._eventEmitter.addListener('RNYandexMobileAds-AppOpen-onAdImpression', this.createListenerFunction(event => {
        var _this$_onAdImpression;
        return (_this$_onAdImpression = this._onAdImpression) === null || _this$_onAdImpression === void 0 ? void 0 : _this$_onAdImpression.call(this, event.impressionData);
      })));
    }
  }

  /**
   * Displays the preloaded ad.
   *
   * @returns {Promise<void>} A promise that rejects if an error occurs.
   */
  async show() {
    try {
      (0, _util.isSupportedPlatform)();
      if (this._id === '') {
        throw new Error();
      }
      await _YandexMobileAdsModule.default.YandexAppOpenAdModule.showAd(this._id);
    } catch (error) {
      return Promise.reject(error);
    }
  }
  delete() {
    this._subscriptions.forEach(subscription => subscription.remove());
    this._id = '';
  }
  createListenerFunction(action) {
    return event => {
      if (event.adId === this._id) {
        action(event);
      }
    };
  }
}
exports.AppOpenAd = AppOpenAd;
//# sourceMappingURL=AppOpenAd.js.map
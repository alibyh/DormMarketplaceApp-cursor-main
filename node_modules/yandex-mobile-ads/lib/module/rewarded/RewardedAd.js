import { isSupportedPlatform } from '../util';
import YandexMobileAdsModule from '../YandexMobileAdsModule';
import { NativeEventEmitter, NativeModules } from 'react-native';

/**
 * This class is responsible for showing a rewarded ad.
 */
export class RewardedAd {
  _subscriptions = [];
  constructor(adId) {
    isSupportedPlatform();
    this._id = adId;
    this._eventEmitter = new NativeEventEmitter(NativeModules.YandexEventEmitter);
    this._subscriptions.push(this._eventEmitter.addListener('RNYandexMobileAds-Rewarded-onAdDeleted', () => {
      return this.delete();
    }));
  }

  /**
   * Creates a new instance of RewardedAd.
   *
   * @returns {Promise<RewardedAd>} A promise that either resolves to a RewardedAd or rejects with an error.
   */
  static async create(adId) {
    try {
      isSupportedPlatform();
      return new RewardedAd(adId);
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
      this._subscriptions.push(this._eventEmitter.addListener('RNYandexMobileAds-Rewarded-onAdShown', this.createListenerFunction(this._onAdShown)));
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
      this._subscriptions.push(this._eventEmitter.addListener('RNYandexMobileAds-Rewarded-onAdFailedToShow', this.createListenerFunction(event => {
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
      this._subscriptions.push(this._eventEmitter.addListener('RNYandexMobileAds-Rewarded-onAdDismissed', this.createListenerFunction(this._onAdDismissed)));
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
      this._subscriptions.push(this._eventEmitter.addListener('RNYandexMobileAds-Rewarded-onAdClicked', this.createListenerFunction(this._onAdClicked)));
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
      this._subscriptions.push(this._eventEmitter.addListener('RNYandexMobileAds-Rewarded-onAdImpression', this.createListenerFunction(event => {
        var _this$_onAdImpression;
        return (_this$_onAdImpression = this._onAdImpression) === null || _this$_onAdImpression === void 0 ? void 0 : _this$_onAdImpression.call(this, event.impressionData);
      })));
    }
  }

  /**
   * Sets the callback function that will be called when the ad has rewarded the user.
   *
   * @param {(reward?: Reward) => voidnType} onAdDidReward_ The callback function that will be called when the ad has rewarded the user.
   */
  set onRewarded(onAdDidReward_) {
    this._onRewarded = onAdDidReward_;
    if (this._onRewarded !== null) {
      this._subscriptions.push(this._eventEmitter.addListener('RNYandexMobileAds-Rewarded-onAdDidReward', this.createListenerFunction(event => {
        var _this$_onRewarded;
        return (_this$_onRewarded = this._onRewarded) === null || _this$_onRewarded === void 0 ? void 0 : _this$_onRewarded.call(this, event.reward);
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
      isSupportedPlatform();
      if (this._id === '') {
        throw new Error();
      }
      await YandexMobileAdsModule.YandexRewardedAdModule.showAd(this._id);
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
//# sourceMappingURL=RewardedAd.js.map
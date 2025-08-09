"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _reactNative = require("react-native");
class AdEventListeners {
  constructor() {
    const {
      AdLoadListener: NativeAdLoadListener
    } = _reactNative.NativeModules;
    this.eventEmitter = new _reactNative.NativeEventEmitter(NativeAdLoadListener);
  }
  addEventListener(event, callback) {
    return this.eventEmitter.addListener(event, callback);
  }
  removeEventListener(subscription) {
    subscription.remove();
  }
  onAdLoaded(callback) {
    return this.addEventListener('onAdLoaded', callback);
  }
  onAdFailedToLoad(callback) {
    return this.addEventListener('onAdFailedToLoad', callback);
  }
  onAdClicked(callback) {
    return this.addEventListener('onAdClicked', callback);
  }
  onLeftApplication(callback) {
    return this.addEventListener('onLeftApplication', callback);
  }
  onReturnedToApplication(callback) {
    return this.addEventListener('onReturnedToApplication', callback);
  }
  onImpression(callback) {
    return this.addEventListener('onImpression', callback);
  }
}
var _default = exports.default = AdEventListeners;
//# sourceMappingURL=EventListener.js.map
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _reactNative = require("react-native");
class AdLoadListeners {
  constructor() {
    const {
      AdLoadListeners: NativeAdLoadListener
    } = _reactNative.NativeModules;
    this.eventEmitter = new _reactNative.NativeEventEmitter(NativeAdLoadListener);
  }
  addLoadListener(event, callback) {
    return this.eventEmitter.addListener(event, callback);
  }
  removeLoadListener(subscription) {
    subscription.remove();
  }
  onAdFailedToLoad(callback) {
    return this.addLoadListener('onAdFailedToLoad', callback);
  }
}
var _default = exports.default = AdLoadListeners;
//# sourceMappingURL=LoadListener.js.map
import { NativeModules, NativeEventEmitter } from 'react-native';
class AdEventListeners {
  constructor() {
    const {
      AdLoadListener: NativeAdLoadListener
    } = NativeModules;
    this.eventEmitter = new NativeEventEmitter(NativeAdLoadListener);
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
export default AdEventListeners;
//# sourceMappingURL=EventListener.js.map
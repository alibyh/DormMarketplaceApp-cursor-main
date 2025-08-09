import { NativeModules, NativeEventEmitter } from 'react-native';
class AdLoadListeners {
  constructor() {
    const {
      AdLoadListeners: NativeAdLoadListener
    } = NativeModules;
    this.eventEmitter = new NativeEventEmitter(NativeAdLoadListener);
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
export default AdLoadListeners;
//# sourceMappingURL=LoadListener.js.map
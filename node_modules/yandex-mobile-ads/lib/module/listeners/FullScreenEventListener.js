import { useEffect } from 'react';
import { NativeEventEmitter } from 'react-native';
const FullScreenAdCallbackName = {
  onAdShown: 'onAdShown',
  onAdFailedToShow: 'onAdFailedToShow',
  onAdDismissed: 'onAdDismissed',
  onAdClicked: 'onAdClicked',
  onAdImpression: 'onAdImpression',
  onRewarded: 'onRewarded'
};
class FullScreenAdEventListener {
  eventEmitter = new NativeEventEmitter();
  constructor(props) {
    this.props = props;
  }
  handleEvent = result => {
    var _this$props$onAdShown, _this$props, _this$props$onAdFaile, _this$props2, _this$props$onAdClick, _this$props3, _this$props$onAdDismi, _this$props4, _this$props$onAdImpre, _this$props5, _this$props$onRewarde, _this$props6;
    switch (result.name) {
      case FullScreenAdCallbackName.onAdShown:
        (_this$props$onAdShown = (_this$props = this.props).onAdShown) === null || _this$props$onAdShown === void 0 || _this$props$onAdShown.call(_this$props);
        break;
      case FullScreenAdCallbackName.onAdFailedToShow:
        (_this$props$onAdFaile = (_this$props2 = this.props).onAdFailedToShow) === null || _this$props$onAdFaile === void 0 || _this$props$onAdFaile.call(_this$props2, {
          description: result.description
        });
        break;
      case FullScreenAdCallbackName.onAdClicked:
        (_this$props$onAdClick = (_this$props3 = this.props).onAdClicked) === null || _this$props$onAdClick === void 0 || _this$props$onAdClick.call(_this$props3);
        break;
      case FullScreenAdCallbackName.onAdDismissed:
        (_this$props$onAdDismi = (_this$props4 = this.props).onAdDismissed) === null || _this$props$onAdDismi === void 0 || _this$props$onAdDismi.call(_this$props4);
        break;
      case FullScreenAdCallbackName.onAdImpression:
        (_this$props$onAdImpre = (_this$props5 = this.props).onAdImpression) === null || _this$props$onAdImpre === void 0 || _this$props$onAdImpre.call(_this$props5, {
          rawData: result.impressionData ?? ''
        });
        break;
      case FullScreenAdCallbackName.onRewarded:
        (_this$props$onRewarde = (_this$props6 = this.props).onRewarded) === null || _this$props$onRewarde === void 0 || _this$props$onRewarde.call(_this$props6, {
          type: result.type,
          amount: result.amount
        });
        break;
      default:
        break;
    }
  };
  setupCallbacks() {
    this.eventEmitter.addListener(this.props.channelName, this.handleEvent);
  }
  waitFor(names) {
    return new Promise(resolve => {
      const handler = result => {
        if (names.includes(result.name)) {
          this.eventEmitter.removeAllListeners(this.props.channelName);
          resolve(result);
        }
      };
      this.eventEmitter.addListener(this.props.channelName, handler);
    });
  }
}
const useFullScreenAdEventListener = props => {
  useEffect(() => {
    const listener = new FullScreenAdEventListener(props);
    listener.setupCallbacks();
    return () => {
      listener.eventEmitter.removeAllListeners(props.channelName);
    };
  }, [props]);
};
export default useFullScreenAdEventListener;
//# sourceMappingURL=FullScreenEventListener.js.map
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
import React from 'react';
import { requireNativeComponent } from 'react-native';
const RNBannerView = requireNativeComponent('BannerView');

/**
 * BannerView component for displaying banner ads.
 *
 * @param {BannerViewProps} props - The properties for the BannerView component.
 *
 * @returns BannerView component.
 */
const BannerView = props => {
  const {
    size,
    adUnitId,
    adRequest,
    onAdLoaded,
    onAdClicked,
    onLeftApplication,
    onReturnToApplication,
    onAdImpression,
    onAdFailedToLoad,
    onAdClose,
    style,
    ...restProps
  } = props;
  let adRequestConfiguration = {
    _adUnitId: adUnitId,
    ...adRequest
  };
  return /*#__PURE__*/React.createElement(RNBannerView, _extends({
    adSize: size,
    adRequest: adRequestConfiguration,
    onAdLoaded: onAdLoaded,
    onAdClicked: onAdClicked,
    onLeftApplication: onLeftApplication,
    onReturnToApplication: onReturnToApplication,
    onAdImpression: onAdImpression,
    onAdFailedToLoad: onAdFailedToLoad,
    onAdClose: onAdClose,
    style: [style, size && {
      height: size.height,
      width: size.width
    }]
  }, restProps));
};
export default BannerView;
//# sourceMappingURL=BannerView.js.map
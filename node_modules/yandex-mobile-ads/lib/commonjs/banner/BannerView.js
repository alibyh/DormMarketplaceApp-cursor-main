"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = _interopRequireDefault(require("react"));
var _reactNative = require("react-native");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const RNBannerView = (0, _reactNative.requireNativeComponent)('BannerView');

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
  return /*#__PURE__*/_react.default.createElement(RNBannerView, _extends({
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
var _default = exports.default = BannerView;
//# sourceMappingURL=BannerView.js.map
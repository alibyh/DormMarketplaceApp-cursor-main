"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isSupportedPlatform = isSupportedPlatform;
var _reactNative = require("react-native");
function isSupportedPlatform() {
  if (!(_reactNative.Platform.OS === 'android' || _reactNative.Platform.OS === 'ios')) {
    throw new Error('The plugin is supported only for Android and iOS.');
  }
}
//# sourceMappingURL=validatingPlatform.js.map
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _InterstitialAd = require("./InterstitialAd");
Object.keys(_InterstitialAd).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _InterstitialAd[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _InterstitialAd[key];
    }
  });
});
var _InterstitialAdLoader = require("./InterstitialAdLoader");
Object.keys(_InterstitialAdLoader).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _InterstitialAdLoader[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _InterstitialAdLoader[key];
    }
  });
});
//# sourceMappingURL=index.js.map
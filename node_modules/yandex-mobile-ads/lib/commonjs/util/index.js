"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _mapping = require("./mapping");
Object.keys(_mapping).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _mapping[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _mapping[key];
    }
  });
});
var _typings = require("./typings");
Object.keys(_typings).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _typings[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _typings[key];
    }
  });
});
var _validatingPlatform = require("./validatingPlatform");
Object.keys(_validatingPlatform).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _validatingPlatform[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _validatingPlatform[key];
    }
  });
});
//# sourceMappingURL=index.js.map
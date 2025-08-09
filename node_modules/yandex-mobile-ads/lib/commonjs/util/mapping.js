"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mapToObject = void 0;
const mapToObject = map => {
  if (!map) {
    return {};
  }
  return Object.fromEntries(map.entries());
};
exports.mapToObject = mapToObject;
//# sourceMappingURL=mapping.js.map
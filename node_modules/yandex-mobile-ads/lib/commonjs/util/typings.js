"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isBoolean = isBoolean;
function isBoolean(value) {
  if (!(typeof value === 'boolean')) {
    throw new Error('Expected to be a boolean value.');
  }
}
//# sourceMappingURL=typings.js.map
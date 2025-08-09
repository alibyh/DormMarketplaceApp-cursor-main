"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _MobileAds = _interopRequireDefault(require("../MobileAds"));
var _mapping = require("../util/mapping");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * A class with data for a targeted ad request.
 */
class AdRequest {
  /**
   * Constructs an instance of an ad request with the provided data.
   *
   * @param params An object containing ad request parameters. See {@link AdRequestParams} for more details.
   */
  constructor(params = {}) {
    const {
      age,
      contextQuery,
      contextTags,
      gender,
      location,
      adTheme,
      biddingData,
      parameters
    } = params;
    this._age = age;
    this._contextQuery = contextQuery;
    this._contextTags = contextTags;
    this._gender = gender;
    this._location = location;
    this._adTheme = adTheme;
    this._biddingData = biddingData;
    const pluginParameters = {
      plugin_type: 'react-native',
      plugin_version: `${_MobileAds.default.pluginVersion}`
    };
    this._parameters = {
      ...pluginParameters,
      ...(0, _mapping.mapToObject)(parameters)
    };
  }
}
var _default = exports.default = AdRequest;
//# sourceMappingURL=AdRequest.js.map
import MobileAds from '../MobileAds';
import { mapToObject } from '../util/mapping';
/**
 * This class is responsible for configuring ad loading.
 */
class AdRequestConfiguration {
  /**
   * Constructs an instance of an ad request configuration with the provided data.
   *
   * @param params An object containing ad request configuration parameters. See {@link AdRequestConfigurationParams} for more details.
   */
  constructor(params) {
    const {
      adUnitId,
      age,
      contextQuery,
      contextTags,
      gender,
      location,
      adTheme,
      biddingData,
      parameters
    } = params;
    this._adUnitId = adUnitId;
    this._age = age;
    this._contextQuery = contextQuery;
    this._contextTags = contextTags;
    this._gender = gender;
    this._location = location;
    this._adTheme = adTheme;
    this._biddingData = biddingData;
    const pluginParameters = {
      plugin_type: 'react-native',
      plugin_version: `${MobileAds.pluginVersion}`
    };
    this._parameters = {
      ...pluginParameters,
      ...mapToObject(parameters)
    };
  }
}
export default AdRequestConfiguration;
//# sourceMappingURL=AdRequestConfiguration.js.map
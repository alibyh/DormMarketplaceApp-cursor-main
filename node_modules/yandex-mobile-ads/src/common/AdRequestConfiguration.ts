import Gender from './Gender';
import AdTheme from './AdTheme';
import Location from './Location';
import MobileAds from '../MobileAds';
import { mapToObject } from '../util/mapping';
import type { AdRequestConfigurationParams } from '../types/AdRequestConfigurationParams.interface';

/**
 * This class is responsible for configuring ad loading.
 */
class AdRequestConfiguration {
    readonly _adUnitId: string;
    readonly _age?: string;
    readonly _contextQuery?: string;
    readonly _contextTags?: string[];
    readonly _gender?: Gender;
    readonly _location?: Location;
    readonly _adTheme?: AdTheme;
    readonly _biddingData?: string;
    readonly _parameters?: object;

    /**
     * Constructs an instance of an ad request configuration with the provided data.
     *
     * @param params An object containing ad request configuration parameters. See {@link AdRequestConfigurationParams} for more details.
     */
    constructor(params: AdRequestConfigurationParams) {
        const {
            adUnitId,
            age,
            contextQuery,
            contextTags,
            gender,
            location,
            adTheme,
            biddingData,
            parameters,
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
            plugin_version: `${MobileAds.pluginVersion}`,
        };
        this._parameters = { ...pluginParameters, ...mapToObject(parameters) };
    }
}

export default AdRequestConfiguration;

import Gender from './Gender';
import AdTheme from './AdTheme';
import Location from './Location';
import type { AdRequestConfigurationParams } from '../types/AdRequestConfigurationParams.interface';
/**
 * This class is responsible for configuring ad loading.
 */
declare class AdRequestConfiguration {
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
    constructor(params: AdRequestConfigurationParams);
}
export default AdRequestConfiguration;
//# sourceMappingURL=AdRequestConfiguration.d.ts.map
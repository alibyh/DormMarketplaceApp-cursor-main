import Gender from './Gender';
import AdTheme from './AdTheme';
import Location from './Location';
import type { AdRequestParams } from '../types/AdRequestParams.interface';
/**
 * A class with data for a targeted ad request.
 */
declare class AdRequest {
    readonly _age?: string;
    readonly _contextQuery?: string;
    readonly _contextTags?: string[];
    readonly _gender?: Gender;
    readonly _location?: Location;
    readonly _adTheme?: AdTheme;
    readonly _biddingData?: string;
    readonly _parameters?: object;
    /**
     * Constructs an instance of an ad request with the provided data.
     *
     * @param params An object containing ad request parameters. See {@link AdRequestParams} for more details.
     */
    constructor(params?: AdRequestParams);
}
export default AdRequest;
//# sourceMappingURL=AdRequest.d.ts.map
import type AdTheme from '../common/AdTheme';
import type Gender from '../common/Gender';
import type Location from '../common/Location';
export interface AdRequestParams {
    /** User age. */
    age?: string;
    /** The search query that the user entered in the app. */
    contextQuery?: string;
    /** List of tags. Matches the context in which the ad will be displayed. */
    contextTags?: string[];
    /** The gender of the user. */
    gender?: Gender;
    /** User location. */
    location?: Location;
    /** Preferred ad theme. */
    adTheme?: AdTheme;
    /** Bidding data for ad loading from mediation. */
    biddingData?: string;
    /** A set of arbitrary input parameters. */
    parameters?: Map<string, string>;
}
//# sourceMappingURL=AdRequestParams.interface.d.ts.map
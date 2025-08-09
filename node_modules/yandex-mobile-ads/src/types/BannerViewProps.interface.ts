import type { StyleProp, ViewStyle } from 'react-native';
import type BannerAdSize from '../banner/BannerAdSize';
import type AdRequest from '../common/AdRequest';

export interface BannerViewProps {
    /** The size of the banner ad. */
    size: BannerAdSize;

    /** The AdUnit ID is a unique identifier in the R-M-XXXXXX-Y format, which is assigned in the Partner interface. */
    adUnitId: string;

    /** Optional ad request for loading the ad. */
    adRequest?: AdRequest;

    /* Optional callback function that will be called when the banner is loaded. */
    onAdLoaded?: Function;

    /** Optional callback function that will be called when the user has clicked on the banner. */
    onAdClicked?: Function;

    /** Optional callback function that will be called when the app will become inactive. */
    onLeftApplication?: Function;

    /** Optional callback function that will be called when the user returned to application after click. */
    onReturnToApplication?: Function;

    /** Optional callback function that will an impression was tracked. */
    onAdImpression?: Function;

    /** Optional callback function that will be called when the banner failed to load. */
    onAdFailedToLoad?: Function;

    /**
     * Optional callback function that will be called when the user has chosen a reason for closing the ad and the ad must be hidden.
     * #### Warning: Advertising will not be hidden. The developer must determine what to do with the ad after the reason for closing it is chosen.
     */
    onAdClose?: Function;

    /** Optional style for the banner view. */
    style?: StyleProp<ViewStyle>;
}

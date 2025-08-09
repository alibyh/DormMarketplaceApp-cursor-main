import AdRequestConfiguration from '../common/AdRequestConfiguration';
import { InterstitialAd } from './InterstitialAd';
/**
 * This class is responsible for loading an Interstitial Ad.
 */
export declare class InterstitialAdLoader {
    private _id?;
    /**
     * Private constructor to prevent direct instantiation.
     * Use InterstitialAdLoader.create() instead.
     */
    private constructor();
    /**
     * Creates a new instance of InterstitialAdLoader.
     *
     * @returns {Promise<InterstitialAdLoader>} A promise that either resolves to an InterstitialAdLoader or rejects with an error.
     */
    static create(): Promise<InterstitialAdLoader>;
    /**
     * Starts loading an interstitial ad with the specified AdRequestConfiguration.
     *
     * @param {AdRequestConfiguration} adRequestConfiguration AdRequestConfiguration.
     *
     * @returns {Promise<InterstitialAd>} A promise that either resolves to an InterstitialAd or rejects with an error.
     */
    loadAd(adRequestConfiguration: AdRequestConfiguration): Promise<InterstitialAd>;
    /**
     * Cancels active loading of the Interstitial Ad.
     *
     * @returns {Promise<void>} A promise that either resolves with no value or rejects with an error.
     */
    cancelLoading(): Promise<void>;
}
//# sourceMappingURL=InterstitialAdLoader.d.ts.map
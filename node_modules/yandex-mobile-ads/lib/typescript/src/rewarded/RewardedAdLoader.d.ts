import AdRequestConfiguration from '../common/AdRequestConfiguration';
import { RewardedAd } from './RewardedAd';
/**
 * This class is responsible for loading a Rewarded Ad.
 */
export declare class RewardedAdLoader {
    private _id?;
    /**
     * Private constructor to prevent direct instantiation.
     * Use RewardedAdLoader.create() instead.
     */
    private constructor();
    /**
     * Creates a new instance of RewardedAdLoader.
     *
     * @returns {Promise<RewardedAdLoader>} A promise that either resolves to a RewardedAdLoader or rejects with an error.
     */
    static create(): Promise<RewardedAdLoader>;
    /**
     * Starts loading a rewarded ad with the specified AdRequestConfiguration.
     *
     * @param {AdRequestConfiguration} adRequestConfiguration AdRequestConfiguration.
     *
     * @returns {Promise<RewardedAd>} A promise that either resolves to a RewardedAd or rejects with an error.
     */
    loadAd(adRequestConfiguration: AdRequestConfiguration): Promise<RewardedAd>;
    /**
     * Cancels active loading of the Rewarded Ad.
     *
     * @returns {Promise<void>} A promise that either resolves with no value or rejects with an error.
     */
    cancelLoading(): Promise<void>;
}
//# sourceMappingURL=RewardedAdLoader.d.ts.map
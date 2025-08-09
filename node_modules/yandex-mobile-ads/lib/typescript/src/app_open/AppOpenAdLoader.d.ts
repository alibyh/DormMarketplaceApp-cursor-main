import AdRequestConfiguration from '../common/AdRequestConfiguration';
import { AppOpenAd } from './AppOpenAd';
/**
 * This class is responsible for loading an AppOpen ad.
 */
export declare class AppOpenAdLoader {
    private _id?;
    /**
     * Private constructor to prevent direct instantiation.
     * Use AppOpenAdLoader.create() instead.
     */
    private constructor();
    /**
     * Creates a new instance of AppOpenAdLoader.
     *
     * @returns {Promise<AppOpenAdLoader>} A promise that either resolves to an AppOpenAdLoader or rejects with an error.
     */
    static create(): Promise<AppOpenAdLoader>;
    /**
     * Starts loading an appOpen ad with the specified AdRequestConfiguration.
     *
     * @param {AdRequestConfiguration} adRequestConfiguration AdRequestConfiguration.
     *
     * @returns {Promise<AppOpenAd>} A promise that either resolves to an AppOpenAd or rejects with an error.
     */
    loadAd(adRequestConfiguration: AdRequestConfiguration): Promise<AppOpenAd>;
    /**
     * Cancels active loading of the AppOpen Ad.
     *
     * @returns {Promise<void>} A promise that either resolves with no value or rejects with an error.
     */
    cancelLoading(): Promise<void>;
}
//# sourceMappingURL=AppOpenAdLoader.d.ts.map
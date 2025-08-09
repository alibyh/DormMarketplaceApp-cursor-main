import YandexMobileAdsModule from '../YandexMobileAdsModule';
import AdRequestConfiguration from '../common/AdRequestConfiguration';
import { isSupportedPlatform } from '../util';
import { RewardedAd } from './RewardedAd';

/**
 * This class is responsible for loading a Rewarded Ad.
 */
export class RewardedAdLoader {
    private _id?: string;

    /**
     * Private constructor to prevent direct instantiation.
     * Use RewardedAdLoader.create() instead.
     */
    private constructor(id: string) {
        this._id = id;
    }

    /**
     * Creates a new instance of RewardedAdLoader.
     *
     * @returns {Promise<RewardedAdLoader>} A promise that either resolves to a RewardedAdLoader or rejects with an error.
     */
    static async create(): Promise<RewardedAdLoader> {
        try {
            isSupportedPlatform();
            const id = await YandexMobileAdsModule.YandexRewardedAdModule.newLoader();
            return new RewardedAdLoader(id);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * Starts loading a rewarded ad with the specified AdRequestConfiguration.
     *
     * @param {AdRequestConfiguration} adRequestConfiguration AdRequestConfiguration.
     *
     * @returns {Promise<RewardedAd>} A promise that either resolves to a RewardedAd or rejects with an error.
     */
    async loadAd(adRequestConfiguration: AdRequestConfiguration): Promise<RewardedAd> {
        try {
            isSupportedPlatform();
            if (!this._id || this._id === '') {
                throw new Error('Loader is not initialized');
            }
            const adId = await YandexMobileAdsModule.YandexRewardedAdModule.loadAd(
                this._id,
                adRequestConfiguration
            );
            const rewardedAd = await RewardedAd.create(adId);
            return rewardedAd;
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * Cancels active loading of the Rewarded Ad.
     *
     * @returns {Promise<void>} A promise that either resolves with no value or rejects with an error.
     */
    async cancelLoading(): Promise<void> {
        try {
            isSupportedPlatform();
            if (!this._id || this._id === '') {
                throw new Error('Loader is not initialized');
            }
            await YandexMobileAdsModule.YandexRewardedAdModule.cancelLoading(this._id);
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    }
}

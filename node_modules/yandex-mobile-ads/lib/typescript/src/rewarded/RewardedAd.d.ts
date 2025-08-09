import type { AdError, ImpressionData, Reward } from '../common/Event';
/**
 * This class is responsible for showing a rewarded ad.
 */
export declare class RewardedAd {
    private _id;
    private _onAdShown?;
    private _onAdFailedToShow?;
    private _onAdDismissed?;
    private _onAdClicked?;
    private _onAdImpression?;
    private _onRewarded?;
    private _eventEmitter;
    private _subscriptions;
    private constructor();
    /**
     * Creates a new instance of RewardedAd.
     *
     * @returns {Promise<RewardedAd>} A promise that either resolves to a RewardedAd or rejects with an error.
     */
    static create(adId: string): Promise<RewardedAd>;
    /**
     * Sets the callback function that will be called after the ad shows.
     *
     * @param {() => void} onAdShown_ The callback function that will be called after the ad shows.
     */
    set onAdShown(onAdShown_: () => void);
    /**
     * Sets the callback function that will be called if the ad can’t be displayed.
     *
     * @param {(error?: AdError) => void} onAdFailedToShow_ The callback function that will be called if the ad can’t be displayed.
     */
    set onAdFailedToShow(onAdFailedToShow_: (error?: AdError) => void);
    /**
     * Sets the callback function that will be called after dismissing the ad.
     *
     * @param {() => void} onAdDismissed_ The callback function that will be called after dismissing the ad.
     */
    set onAdDismissed(onAdDismissed_: () => void);
    /**
     * Sets the callback function that will be called when the user clicks on the ad.
     *
     * @param {() => void} onAdClicked_ The callback function that will be called when the user clicks on the ad.
     */
    set onAdClicked(onAdClicked_: () => void);
    /**
     * Sets the callback function that will be called when an impression is tracked.
     *
     * @param {(impressionData?: ImpressionData) => void} onAdImpression_ The callback function that will be called when an impression is tracked.
     */
    set onAdImpression(onAdImpression_: (impressionData?: ImpressionData) => void);
    /**
     * Sets the callback function that will be called when the ad has rewarded the user.
     *
     * @param {(reward?: Reward) => voidnType} onAdDidReward_ The callback function that will be called when the ad has rewarded the user.
     */
    set onRewarded(onAdDidReward_: (reward?: Reward) => void);
    /**
     * Displays the preloaded ad.
     *
     * @returns {Promise<void>} A promise that rejects if an error occurs.
     */
    show(): Promise<void>;
    private delete;
    private createListenerFunction;
}
//# sourceMappingURL=RewardedAd.d.ts.map
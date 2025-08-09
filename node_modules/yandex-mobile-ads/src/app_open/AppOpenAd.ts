import type { AdError, AdEvent, ImpressionData } from '../common/Event';
import { isSupportedPlatform } from '../util';
import YandexMobileAdsModule from '../YandexMobileAdsModule';
import { NativeEventEmitter, NativeModules, type EmitterSubscription } from 'react-native';

/**
 * This class is responsible for showing an app open ad.
 */
export class AppOpenAd {
    private _id: string;
    private _onAdShown?: () => void;
    private _onAdFailedToShow?: (error?: AdError) => void;
    private _onAdDismissed?: () => void;
    private _onAdClicked?: () => void;
    private _onAdImpression?: (impressionData?: ImpressionData) => void;
    private _eventEmitter: NativeEventEmitter;
    private _subscriptions: EmitterSubscription[] = [];

    private constructor(adId: string) {
        this._id = adId;
        this._eventEmitter = new NativeEventEmitter(NativeModules.YandexEventEmitter);
        this._subscriptions.push(
            this._eventEmitter.addListener('RNYandexMobileAds-AppOpen-onAdDeleted', () => {
                return this.delete();
            })
        );
    }

    /**
     * Creates a new instance of AppOpenAd.
     *
     * @returns {Promise<AppOpenAd>} A promise that either resolves to an AppOpenAd or rejects with an error.
     */
    static async create(adId: string): Promise<AppOpenAd> {
        try {
            isSupportedPlatform();
            return new AppOpenAd(adId);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * Sets the callback function that will be called after the ad shows.
     *
     * @param {() => void} onAdShown_ The callback function that will be called after the ad shows.
     */
    public set onAdShown(onAdShown_: () => void) {
        this._onAdShown = onAdShown_;
        if (this._onAdShown !== null) {
            this._subscriptions.push(
                this._eventEmitter.addListener(
                    'RNYandexMobileAds-AppOpen-onAdShown',
                    this.createListenerFunction(this._onAdShown)
                )
            );
        }
    }

    /**
     * Sets the callback function that will be called if the ad can’t be displayed.
     *
     * @param {(error?: AdError) => void} onAdFailedToShow_ The callback function that will be called if the ad can’t be displayed.
     */
    public set onAdFailedToShow(onAdFailedToShow_: (error?: AdError) => void) {
        this._onAdFailedToShow = onAdFailedToShow_;
        if (this._onAdFailedToShow != null) {
            this._subscriptions.push(
                this._eventEmitter.addListener(
                    'RNYandexMobileAds-AppOpen-onAdFailedToShow',
                    this.createListenerFunction((event: AdEvent) =>
                        this._onAdFailedToShow?.(event.error)
                    )
                )
            );
        }
    }

    /**
     * Sets the callback function that will be called after dismissing the ad.
     *
     * @param {() => void} onAdDismissed_ The callback function that will be called after dismissing the ad.
     */
    public set onAdDismissed(onAdDismissed_: () => void) {
        this._onAdDismissed = onAdDismissed_;
        if (this._onAdDismissed != null) {
            this._subscriptions.push(
                this._eventEmitter.addListener(
                    'RNYandexMobileAds-AppOpen-onAdDismissed',
                    this.createListenerFunction(this._onAdDismissed)
                )
            );
        }
    }

    /**
     * Sets the callback function that will be called when the user clicks on the ad.
     *
     * @param {() => void} onAdClicked_ The callback function that will be called when the user clicks on the ad.
     */
    public set onAdClicked(onAdClicked_: () => void) {
        this._onAdClicked = onAdClicked_;
        if (this._onAdClicked !== null) {
            this._subscriptions.push(
                this._eventEmitter.addListener(
                    'RNYandexMobileAds-AppOpen-onAdClicked',
                    this.createListenerFunction(this._onAdClicked)
                )
            );
        }
    }

    /**
     * Sets the callback function that will be called when an impression is tracked.
     *
     * @param {(impressionData?: ImpressionData) => void} onAdImpression_ The callback function that will be called when an impression is tracked.
     */
    public set onAdImpression(onAdImpression_: (impressionData?: ImpressionData) => void) {
        this._onAdImpression = onAdImpression_;
        if (this._onAdImpression !== null) {
            this._subscriptions.push(
                this._eventEmitter.addListener(
                    'RNYandexMobileAds-AppOpen-onAdImpression',
                    this.createListenerFunction((event: AdEvent) =>
                        this._onAdImpression?.(event.impressionData)
                    )
                )
            );
        }
    }

    /**
     * Displays the preloaded ad.
     *
     * @returns {Promise<void>} A promise that rejects if an error occurs.
     */
    async show(): Promise<void> {
        try {
            isSupportedPlatform();
            if (this._id === '') {
                throw new Error();
            }
            await YandexMobileAdsModule.YandexAppOpenAdModule.showAd(this._id);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    private delete() {
        this._subscriptions.forEach((subscription) => subscription.remove());
        this._id = '';
    }

    private createListenerFunction(action: Function) {
        return (event: AdEvent) => {
            if (event.adId === this._id) {
                action(event);
            }
        };
    }
}

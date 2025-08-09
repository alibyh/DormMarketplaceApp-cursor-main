import { NativeModules, NativeEventEmitter } from 'react-native';
import type { EmitterSubscription } from 'react-native';

interface AdRequestError {
    code: string;
    description: string;
    adUnitId?: string;
}

interface ImpressionData {
    rawData: string;
}

class AdEventListeners {
    private eventEmitter: NativeEventEmitter;

    constructor() {
        const { AdLoadListener: NativeAdLoadListener } = NativeModules;
        this.eventEmitter = new NativeEventEmitter(NativeAdLoadListener);
    }

    addEventListener(event: string, callback: (...args: any[]) => void): EmitterSubscription {
        return this.eventEmitter.addListener(event, callback);
    }

    removeEventListener(subscription: EmitterSubscription) {
        subscription.remove();
    }

    onAdLoaded(callback: () => void): EmitterSubscription {
        return this.addEventListener('onAdLoaded', callback);
    }

    onAdFailedToLoad(callback: (error: AdRequestError) => void): EmitterSubscription {
        return this.addEventListener('onAdFailedToLoad', callback);
    }

    onAdClicked(callback: () => void): EmitterSubscription {
        return this.addEventListener('onAdClicked', callback);
    }

    onLeftApplication(callback: () => void): EmitterSubscription {
        return this.addEventListener('onLeftApplication', callback);
    }

    onReturnedToApplication(callback: () => void): EmitterSubscription {
        return this.addEventListener('onReturnedToApplication', callback);
    }

    onImpression(callback: (impressionData?: ImpressionData) => void): EmitterSubscription {
        return this.addEventListener('onImpression', callback);
    }
}

export default AdEventListeners;

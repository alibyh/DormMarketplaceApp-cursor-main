import { NativeModules, NativeEventEmitter } from 'react-native';
import type { EmitterSubscription } from 'react-native';

interface AdRequestError {
    code: string;
    description: string;
    adUnitId?: string;
}

class AdLoadListeners {
    private eventEmitter: NativeEventEmitter;

    constructor() {
        const { AdLoadListeners: NativeAdLoadListener } = NativeModules;
        this.eventEmitter = new NativeEventEmitter(NativeAdLoadListener);
    }

    addLoadListener(event: string, callback: (...args: any[]) => void): EmitterSubscription {
        return this.eventEmitter.addListener(event, callback);
    }

    removeLoadListener(subscription: EmitterSubscription) {
        subscription.remove();
    }

    onAdFailedToLoad(callback: (error: AdRequestError) => void): EmitterSubscription {
        return this.addLoadListener('onAdFailedToLoad', callback);
    }
}

export default AdLoadListeners;

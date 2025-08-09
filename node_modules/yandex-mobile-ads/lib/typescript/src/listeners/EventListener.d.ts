import type { EmitterSubscription } from 'react-native';
interface AdRequestError {
    code: string;
    description: string;
    adUnitId?: string;
}
interface ImpressionData {
    rawData: string;
}
declare class AdEventListeners {
    private eventEmitter;
    constructor();
    addEventListener(event: string, callback: (...args: any[]) => void): EmitterSubscription;
    removeEventListener(subscription: EmitterSubscription): void;
    onAdLoaded(callback: () => void): EmitterSubscription;
    onAdFailedToLoad(callback: (error: AdRequestError) => void): EmitterSubscription;
    onAdClicked(callback: () => void): EmitterSubscription;
    onLeftApplication(callback: () => void): EmitterSubscription;
    onReturnedToApplication(callback: () => void): EmitterSubscription;
    onImpression(callback: (impressionData?: ImpressionData) => void): EmitterSubscription;
}
export default AdEventListeners;
//# sourceMappingURL=EventListener.d.ts.map
import type { EmitterSubscription } from 'react-native';
interface AdRequestError {
    code: string;
    description: string;
    adUnitId?: string;
}
declare class AdLoadListeners {
    private eventEmitter;
    constructor();
    addLoadListener(event: string, callback: (...args: any[]) => void): EmitterSubscription;
    removeLoadListener(subscription: EmitterSubscription): void;
    onAdFailedToLoad(callback: (error: AdRequestError) => void): EmitterSubscription;
}
export default AdLoadListeners;
//# sourceMappingURL=LoadListener.d.ts.map
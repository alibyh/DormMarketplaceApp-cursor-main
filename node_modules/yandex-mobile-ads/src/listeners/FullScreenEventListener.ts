import { useEffect } from 'react';
import { NativeEventEmitter } from 'react-native';

interface AdError {
    description: string;
}

interface ImpressionData {
    rawData: string;
}

interface Reward {
    type: string;
    amount: number;
}

interface FullScreenAdEventListenerProps {
    channelName: string;
    onAdShown?: () => void;
    onAdFailedToShow?: (error: AdError) => void;
    onAdDismissed?: () => void;
    onAdClicked?: () => void;
    onAdImpression?: (impressionData: ImpressionData) => void;
    onRewarded?: (reward: Reward) => void;
}

const FullScreenAdCallbackName = {
    onAdShown: 'onAdShown',
    onAdFailedToShow: 'onAdFailedToShow',
    onAdDismissed: 'onAdDismissed',
    onAdClicked: 'onAdClicked',
    onAdImpression: 'onAdImpression',
    onRewarded: 'onRewarded',
};

class FullScreenAdEventListener {
    eventEmitter = new NativeEventEmitter();
    private props: FullScreenAdEventListenerProps;

    constructor(props: FullScreenAdEventListenerProps) {
        this.props = props;
    }

    private handleEvent = (result: any) => {
        switch (result.name) {
            case FullScreenAdCallbackName.onAdShown:
                this.props.onAdShown?.();
                break;
            case FullScreenAdCallbackName.onAdFailedToShow:
                this.props.onAdFailedToShow?.({ description: result.description });
                break;
            case FullScreenAdCallbackName.onAdClicked:
                this.props.onAdClicked?.();
                break;
            case FullScreenAdCallbackName.onAdDismissed:
                this.props.onAdDismissed?.();
                break;
            case FullScreenAdCallbackName.onAdImpression:
                this.props.onAdImpression?.({ rawData: result.impressionData ?? '' });
                break;
            case FullScreenAdCallbackName.onRewarded:
                this.props.onRewarded?.({ type: result.type, amount: result.amount });
                break;
            default:
                break;
        }
    };

    setupCallbacks() {
        this.eventEmitter.addListener(this.props.channelName, this.handleEvent);
    }

    waitFor(names: string[]): Promise<any> {
        return new Promise((resolve) => {
            const handler = (result: any) => {
                if (names.includes(result.name)) {
                    this.eventEmitter.removeAllListeners(this.props.channelName);
                    resolve(result);
                }
            };
            this.eventEmitter.addListener(this.props.channelName, handler);
        });
    }
}

const useFullScreenAdEventListener = (props: FullScreenAdEventListenerProps) => {
    useEffect(() => {
        const listener = new FullScreenAdEventListener(props);
        listener.setupCallbacks();

        return () => {
            listener.eventEmitter.removeAllListeners(props.channelName);
        };
    }, [props]);
};

export default useFullScreenAdEventListener;

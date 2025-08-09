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
declare const useFullScreenAdEventListener: (props: FullScreenAdEventListenerProps) => void;
export default useFullScreenAdEventListener;
//# sourceMappingURL=FullScreenEventListener.d.ts.map
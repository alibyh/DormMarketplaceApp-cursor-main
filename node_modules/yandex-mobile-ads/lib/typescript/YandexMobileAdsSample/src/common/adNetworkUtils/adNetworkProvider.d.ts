import Network from './adNetwork';
declare class AdNetworkProvider {
    static instance: AdNetworkProvider;
    bannerInlineAdNetworks: Network[];
    bannerStickyAdNetworks: Network[];
    interstitialAdNetworks: Network[];
    rewardedAdNetworks: Network[];
    appOpenAdNetworks: Network[];
    private static createInstance;
}
export default AdNetworkProvider;
//# sourceMappingURL=adNetworkProvider.d.ts.map
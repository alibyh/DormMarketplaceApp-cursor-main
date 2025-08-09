import React from 'react';
import { requireNativeComponent, type ViewStyle } from 'react-native';
import { type StyleProp } from 'react-native';
import BannerAdSize from './BannerAdSize';
import AdRequestConfiguration from '../common/AdRequestConfiguration';
import type { BannerViewProps } from '../types/BannerViewProps.interface';

interface NativeBannerViewProps {
    adSize: BannerAdSize;
    adRequest?: AdRequestConfiguration;
    onAdLoaded?: Function;
    onAdClicked?: Function;
    onLeftApplication?: Function;
    onReturnToApplication?: Function;
    onAdImpression?: Function;
    onAdFailedToLoad?: Function;
    onAdClose?: Function;
    style?: StyleProp<ViewStyle>;
}

const RNBannerView = requireNativeComponent<NativeBannerViewProps>('BannerView');

/**
 * BannerView component for displaying banner ads.
 *
 * @param {BannerViewProps} props - The properties for the BannerView component.
 *
 * @returns BannerView component.
 */
const BannerView = (props: BannerViewProps) => {
    const {
        size,
        adUnitId,
        adRequest,
        onAdLoaded,
        onAdClicked,
        onLeftApplication,
        onReturnToApplication,
        onAdImpression,
        onAdFailedToLoad,
        onAdClose,
        style,
        ...restProps
    } = props;
    let adRequestConfiguration: AdRequestConfiguration = { _adUnitId: adUnitId, ...adRequest };
    return (
        <RNBannerView
            adSize={size}
            adRequest={adRequestConfiguration}
            onAdLoaded={onAdLoaded}
            onAdClicked={onAdClicked}
            onLeftApplication={onLeftApplication}
            onReturnToApplication={onReturnToApplication}
            onAdImpression={onAdImpression}
            onAdFailedToLoad={onAdFailedToLoad}
            onAdClose={onAdClose}
            style={[style, size && { height: size.height, width: size.width }]}
            {...restProps}
        />
    );
};

export default BannerView;

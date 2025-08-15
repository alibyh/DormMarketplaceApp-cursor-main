// modules/yandex-ads/YandexBannerView.js
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, UIManager, findNodeHandle } from 'react-native';
import { showBanner, hideBanner } from './index';

const YandexBannerView = ({ adUnitId, style, onAdLoaded, onAdFailedToLoad, onAdClicked }) => {
  const viewRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const showAd = async () => {
      try {
        if (viewRef.current) {
          const nodeHandle = findNodeHandle(viewRef.current);
          
          if (nodeHandle) {
            await showBanner(adUnitId, {
              viewTag: nodeHandle,
              onAdLoaded: () => {
                console.log('[YandexBannerView] Ad loaded successfully');
                if (isMounted && onAdLoaded) {
                  onAdLoaded();
                }
              },
              onAdFailedToLoad: (error) => {
                console.error('[YandexBannerView] Ad failed to load:', error);
                if (isMounted && onAdFailedToLoad) {
                  onAdFailedToLoad(error);
                }
              },
              onAdClicked: () => {
                console.log('[YandexBannerView] Ad clicked');
                if (isMounted && onAdClicked) {
                  onAdClicked();
                }
              }
            });
          }
        }
      } catch (error) {
        console.error('[YandexBannerView] Error showing banner:', error);
        if (isMounted && onAdFailedToLoad) {
          onAdFailedToLoad(error);
        }
      }
    };

    showAd();

    return () => {
      isMounted = false;
      hideBanner().catch(error => {
        console.error('[YandexBannerView] Error hiding banner:', error);
      });
    };
  }, [adUnitId, onAdLoaded, onAdFailedToLoad, onAdClicked]);

  return (
    <View
      ref={viewRef}
      style={[styles.container, style]}
      collapsable={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 50,
    backgroundColor: 'transparent',
  },
});

export default YandexBannerView;

// components/YandexBanner/YandexBanner.js
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { MobileAds, BannerView, BannerAdSize, AdRequest } from 'yandex-mobile-ads';

const AD_UNIT_ID = 'demo-banner-yandex';

function YandexBanner({ onAdLoaded }) {
  const [adSize, setAdSize] = useState(null);
  const [adRequest, setAdRequest] = useState(null);
  const [status, setStatus] = useState('init'); // init | ready | loaded | error
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  useEffect(() => {
    (async () => {
      try {
        MobileAds.enableLogging?.();
        await MobileAds.initialize();

        const width = Math.min(Dimensions.get('window').width, 360);
        // Use SDK factory — not a plain object
        const size = await BannerAdSize.inlineSize(width, 250);

        if (!mounted.current) return;
        setAdSize(size);
        setAdRequest(new AdRequest());
        setStatus('ready');
      } catch (e) {
        if (!mounted.current) return;
        setError(e?.message || 'SDK init failed');
        setStatus('error');
      }
    })();
  }, []);

  if (status === 'init') {
    return (
      <View style={{ height: 180, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading ad…</Text>
      </View>
    );
  }

  if (status === 'error') {
    // If you need a clickable fallback, do it here instead of spoofing an ad everywhere
    return (
      <View style={{ height: 180, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Ad error: {error}</Text>
      </View>
    );
  }

  if (!adSize || !adRequest) {
    return (
      <View style={{ height: 180, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Preparing…</Text>
      </View>
    );
  }

  return (
    <BannerView
      adUnitId={AD_UNIT_ID}
      size={adSize}
      adRequest={adRequest}
      onAdLoaded={() => {
        if (!mounted.current) return;
        setStatus('loaded');
        onAdLoaded && onAdLoaded();
      }}
      onAdFailedToLoad={e => {
        if (!mounted.current) return;
        setStatus('error');
        setError(e?.nativeEvent?.description || 'Failed to load');
      }}
      onAdClicked={() => {}}
    />
  );
}


const styles = StyleSheet.create({
  container: {
    width: screenWidth,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  bannerView: {
    width: screenWidth - 32,
    height: 50,
    backgroundColor: '#4285F4',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  adContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  adText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  adSubtext: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
  debugText: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  placeholderBanner: {
    width: screenWidth - 32,
    height: 50,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  placeholderText: {
    color: '#666',
    fontSize: 14,
  },
  adIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adIndicatorText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  fallbackContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  fallbackText: {
    color: '#666',
    fontSize: 12,
  },
  consoleLogsContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
    zIndex: 10,
  },
  consoleLogsTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  consoleLogText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 2,
  },
});

export default YandexBanner;

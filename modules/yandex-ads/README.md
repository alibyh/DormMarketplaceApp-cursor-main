# Yandex Mobile Ads Module for React Native

This module provides integration with Yandex Mobile Ads SDK for React Native applications.

## Features

- Banner ads
- Interstitial ads
- Rewarded ads

## Installation

1. Install the package:
```bash
npm install --save yandex-mobile-ads
```

2. Link the native modules:
```bash
npx pod-install
```

## Usage

### Initialize the SDK

```javascript
import { initializeYandexAds } from 'yandex-mobile-ads';

// Initialize the SDK
await initializeYandexAds();
```

### Show Banner Ads

```javascript
import YandexBannerView from 'yandex-mobile-ads/YandexBannerView';

// In your component
<YandexBannerView
  adUnitId="your-ad-unit-id"
  style={{ width: '100%', height: 50 }}
  onAdLoaded={() => console.log('Ad loaded')}
  onAdFailedToLoad={(error) => console.log('Ad failed to load:', error)}
/>
```

### Show Interstitial Ads

```javascript
import { loadInterstitial, showInterstitial, isInterstitialLoaded } from 'yandex-mobile-ads';

// Load the interstitial ad
await loadInterstitial('your-ad-unit-id');

// Check if the ad is loaded
const isLoaded = await isInterstitialLoaded();

// Show the ad if it's loaded
if (isLoaded) {
  await showInterstitial();
}
```

### Show Rewarded Ads

```javascript
import { loadRewarded, showRewarded, isRewardedLoaded } from 'yandex-mobile-ads';

// Load the rewarded ad
await loadRewarded('your-ad-unit-id');

// Check if the ad is loaded
const isLoaded = await isRewardedLoaded();

// Show the ad if it's loaded
if (isLoaded) {
  await showRewarded();
}
```

## Events

You can listen for ad events using the event emitter:

```javascript
import { NativeEventEmitter, NativeModules } from 'react-native';

const yandexAdsEmitter = new NativeEventEmitter(NativeModules.YandexAdsModule);

// Add event listeners
const onAdLoaded = yandexAdsEmitter.addListener('onAdLoaded', (event) => {
  console.log('Ad loaded:', event.type);
});

const onAdFailedToLoad = yandexAdsEmitter.addListener('onAdFailedToLoad', (event) => {
  console.log('Ad failed to load:', event.type, event.error);
});

// Don't forget to remove listeners when component unmounts
onAdLoaded.remove();
onAdFailedToLoad.remove();
```

## License

This project is licensed under the MIT License.

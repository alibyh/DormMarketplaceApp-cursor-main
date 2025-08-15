// plugins/yandex-ads/index.js
const { withPlugins } = require('@expo/config-plugins');
const withYandexAds = require('../withYandexAds');
const withYandexAdsAndroid = require('../withYandexAdsAndroid');

// Combine iOS and Android plugins
module.exports = (config) => {
  return withPlugins(config, [
    [withYandexAds, { sdkVersion: '7.14.0' }],
    [withYandexAdsAndroid, { sdkVersion: '6.4.0' }]
  ]);
};
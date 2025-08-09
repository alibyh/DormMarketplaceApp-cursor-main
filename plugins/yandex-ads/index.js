const { withPlugins } = require('@expo/config-plugins');

const withYandexAds = (config, { android = {}, ios = {} }) => {
  // Save the original config
  const modifiedConfig = { ...config };

  // Add iOS configuration
  if (!modifiedConfig.ios) {
    modifiedConfig.ios = {};
  }
  modifiedConfig.ios.yandexAdsAppId = ios.appId;

  // Add Android configuration
  if (!modifiedConfig.android) {
    modifiedConfig.android = {};
  }
  modifiedConfig.android.yandexAdsAppId = android.appId;

  return modifiedConfig;
};

module.exports = withYandexAds;
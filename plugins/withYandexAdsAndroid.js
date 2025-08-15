// plugins/withYandexAdsAndroid.js
const { withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

function withYandexAdsAndroid(config, { sdkVersion = "6.4.0" } = {}) {
  // Add Yandex Maven repository to project build.gradle
  config = withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('maven { url "https://maven.google.com/" }')) {
      config.modResults.contents = config.modResults.contents.replace(
        /allprojects\s*{\s*repositories\s*{/,
        `allprojects { repositories {\n        maven { url "https://maven.google.com/" }\n        maven { url "https://maven.yandex.net/repository/yandex-ads/" }`
      );
    }
    return config;
  });

  // Add Yandex Ads SDK dependency to app build.gradle
  config = withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes("com.yandex.android:mobileads")) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s*{/,
        `dependencies {\n    implementation "com.yandex.android:mobileads:${sdkVersion}"`
      );
    }
    return config;
  });

  return config;
}

module.exports = withYandexAdsAndroid;

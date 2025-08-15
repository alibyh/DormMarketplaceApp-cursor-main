// plugins/withYandexAdsAndroid.js
const { withAppBuildGradle, withProjectBuildGradle, withMainApplication } = require('@expo/config-plugins');

function withYandexAdsAndroid(config, { sdkVersion = "6.4.0" } = {}) {
  // Add Yandex Maven repository to project build.gradle
  config = withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('maven { url "https://maven.yandex.net/repository/yandex-ads/" }')) {
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
  
  // Modify MainApplication.java to initialize Yandex Mobile Ads SDK
  config = withMainApplication(config, (config) => {
    const mainApplication = config.modResults;
    
    // Add import statement if it doesn't exist
    if (!mainApplication.contents.includes("import com.yandex.mobile.ads.common.MobileAds;")) {
      const importStatement = "import com.yandex.mobile.ads.common.MobileAds;";
      mainApplication.contents = mainApplication.contents.replace(
        /package ([^;]+);/,
        `package $1;\n\n${importStatement}`
      );
    }
    
    // Add initialization code in onCreate method
    if (!mainApplication.contents.includes("MobileAds.initialize")) {
      mainApplication.contents = mainApplication.contents.replace(
        /public void onCreate\(\) {/,
        `public void onCreate() {
    // Initialize Yandex Mobile Ads SDK
    MobileAds.initialize(this, () -> {
      // SDK initialized
    });`
      );
    }
    
    return config;
  });

  return config;
}

module.exports = withYandexAdsAndroid;

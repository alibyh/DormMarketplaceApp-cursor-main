// plugins/withYandexAds.js
module.exports = function withYandexAds(config, { sdkVersion = "7.13.0" } = {}) {
  return require("@expo/config-plugins").withDangerousMod(config, [
    "ios",
    async (c) => {
      const podLine = `  pod 'YandexMobileAds', '${sdkVersion}'`;
      c.modResults.contents = c.modResults.contents.replace(
        "use_expo_modules!",
        `use_expo_modules!\n${podLine}`
      );
      return c;
    },
  ]);
};

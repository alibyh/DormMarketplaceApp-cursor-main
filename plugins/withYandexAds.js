// plugins/withYandexAds.js
const { withDangerousMod, withAppDelegate } = require("@expo/config-plugins");

module.exports = function withYandexAds(config, { sdkVersion = "7.14.0" } = {}) {
  // Add pod dependency
  config = withDangerousMod(config, [
    "ios",
    async (c) => {
      console.log(`Adding YandexMobileAds pod (version ${sdkVersion})...`);
      const podLine = `  pod 'YandexMobileAds', '${sdkVersion}'`;
      c.modResults.contents = c.modResults.contents.replace(
        "use_expo_modules!",
        `use_expo_modules!\n${podLine}`
      );
      return c;
    },
  ]);
  
  // Modify AppDelegate to initialize Yandex SDK
  config = withAppDelegate(config, (config) => {
    const appDelegate = config.modResults;
    
    // Check if we already added the import
    if (!appDelegate.contents.includes("#import <YandexMobileAds/YandexMobileAds.h>")) {
      // Add import at the top of the file
      appDelegate.contents = appDelegate.contents.replace(
        "#import \"AppDelegate.h\"",
        "#import \"AppDelegate.h\"\n#import <YandexMobileAds/YandexMobileAds.h>"
      );
      
      // Add initialization code in didFinishLaunchingWithOptions
      appDelegate.contents = appDelegate.contents.replace(
        "- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions",
        `- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Initialize Yandex Mobile Ads SDK
  [[YMAMobileAds sharedInstance] activateWithCompletionHandler:nil];
  
  // Original implementation continues below`
      );
    }
    
    return config;
  });
  
  return config;
};

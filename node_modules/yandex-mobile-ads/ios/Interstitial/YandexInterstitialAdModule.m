#if !TARGET_OS_MACCATALYST

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(YandexInterstitialAdModule, NSObject)

RCT_EXTERN_METHOD(newLoader: (RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(loadAd: (NSString *)loaderId
                  adRequestConfiguration:(NSDictionary *)adRequestConfiguration
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(cancelLoading: (NSString *)loaderId)

RCT_EXTERN_METHOD(showAd: (NSString *)adObjectId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end

#endif

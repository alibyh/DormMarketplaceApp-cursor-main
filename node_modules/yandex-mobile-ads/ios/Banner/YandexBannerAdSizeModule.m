#if !TARGET_OS_MACCATALYST

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(YandexBannerAdSizeModule, NSObject)

RCT_EXTERN_METHOD(createStickyBannerSize: (nonnull NSNumber *)width
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(createInlineBannerSize: (nonnull NSNumber *)width
                  maxHeight:(nonnull NSNumber *)maxHeight
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end

#endif

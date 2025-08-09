#if !TARGET_OS_MACCATALYST

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_REMAP_MODULE(YandexMobileAds, YandexMobileAdsModule, NSObject)

RCT_EXTERN_METHOD(getLibraryVersion: (RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(initializeSdk: (RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(showDebugPanel: (RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(enableLogging: (BOOL)enableLogging)

RCT_EXTERN_METHOD(enableDebugErrorIndicator: (BOOL)enableIndicator)

RCT_EXTERN_METHOD(setLocationConsent: (BOOL)locationConsent)

RCT_EXTERN_METHOD(setAgeRestrictedUser: (BOOL)ageRestrictedUser)

RCT_EXTERN_METHOD(setUserConsent: (BOOL)consent)

@end

#endif

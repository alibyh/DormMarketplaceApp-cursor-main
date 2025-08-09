#if !targetEnvironment(macCatalyst)

import Foundation
import YandexMobileAds

@objc(YandexMobileAdsModule)
class YandexMobileAdsModule: NSObject {
    @objc
    func methodQueue() -> DispatchQueue {
        DispatchQueue.main
    }
    
    @objc
    func getLibraryVersion(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
        let libraryVersion = MobileAds.sdkVersion()
        resolve(libraryVersion)
    }
    
    @objc
    func initializeSdk(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
        MobileAds.initializeSDK {
            resolve(nil)
        }
    }
    
    @objc
    func showDebugPanel(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
        MobileAds.showDebugPanel()
        resolve(nil)
    }
    
    @objc
    func enableLogging(_ enableLogging: Bool) {
        if enableLogging {
            MobileAds.enableLogging()
        }
    }
    
    @objc
    func enableDebugErrorIndicator(_ enableIndicator: Bool) {
        /* Do something later */
    }
    
    @objc
    func setLocationConsent(_ locationConsent: Bool) {
        MobileAds.setLocationTrackingEnabled(locationConsent)
    }
    
    @objc
    func setAgeRestrictedUser(_ ageRestrictedUser: Bool) {
        MobileAds.setAgeRestrictedUser(ageRestrictedUser)
    }
    
    @objc
    func setUserConsent(_ consent: Bool) {
        MobileAds.setUserConsent(consent)
    }
}

#endif

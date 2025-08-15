// ios/YandexAdsModule.swift
import Foundation
import YandexMobileAds
import ExpoModulesCore

public class YandexAdsModule: Module {
  // Define the module name that JavaScript will use to access this module
  public func definition() -> ModuleDefinition {
    Name("YandexAdsModule")
    
    // Define methods that can be called from JavaScript
    AsyncFunction("initializeSDK") { (promise: Promise) in
      YMAMobileAds.shared().setUserConsent(true)
      YMAMobileAds.shared().activate { error in
        if let error = error {
          promise.reject("INIT_ERROR", "Failed to initialize Yandex Mobile Ads: \(error.localizedDescription)")
        } else {
          promise.resolve(true)
        }
      }
    }
    
    AsyncFunction("loadBanner") { (adUnitId: String, promise: Promise) in
      DispatchQueue.main.async {
        let banner = YMAAdView(adUnitID: adUnitId, adSize: YMAAdSize.flexibleSize(with: .init(width: 320, height: 50)))
        banner.delegate = BannerAdDelegate.shared
        banner.loadAd()
        
        BannerAdDelegate.shared.onAdLoaded = {
          promise.resolve(true)
        }
        
        BannerAdDelegate.shared.onAdFailedToLoad = { error in
          promise.reject("BANNER_ERROR", "Failed to load banner: \(error.localizedDescription)")
        }
      }
    }
  }
}

// Delegate to handle banner ad events
class BannerAdDelegate: NSObject, YMAAdViewDelegate {
  static let shared = BannerAdDelegate()
  
  var onAdLoaded: (() -> Void)?
  var onAdFailedToLoad: ((Error) -> Void)?
  
  func adViewDidLoad(_ adView: YMAAdView) {
    print("Yandex banner loaded successfully")
    onAdLoaded?()
  }
  
  func adViewDidFailLoading(_ adView: YMAAdView, error: Error) {
    print("Yandex banner failed to load: \(error.localizedDescription)")
    onAdFailedToLoad?(error)
  }
  
  func adViewWillLeaveApplication(_ adView: YMAAdView) {
    print("Yandex banner will leave application")
  }
  
  func adViewDidClick(_ adView: YMAAdView) {
    print("Yandex banner clicked")
  }
  
  func adViewWillPresentScreen(_ adView: YMAAdView) {
    print("Yandex banner will present screen")
  }
  
  func adViewDidDismissScreen(_ adView: YMAAdView) {
    print("Yandex banner did dismiss screen")
  }
  
  func adView(_ adView: YMAAdView, willPresentScreen viewController: UIViewController?) {
    print("Yandex banner will present screen with view controller")
  }
  
  func adView(_ adView: YMAAdView, didDismissScreen viewController: UIViewController?) {
    print("Yandex banner did dismiss screen with view controller")
  }
}

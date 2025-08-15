import Foundation
import YandexMobileAds
import React

@objc(YandexAdsModule)
class YandexAdsModule: RCTEventEmitter {
  
  private var hasListeners = false
  private var bannerView: YMAAdView?
  private var interstitialAd: YMAInterstitialAd?
  private var rewardedAd: YMARewardedAd?
  private var isInterstitialLoaded = false
  private var isRewardedLoaded = false
  
  override init() {
    super.init()
  }
  
  override func supportedEvents() -> [String]! {
    return ["onAdLoaded", "onAdFailedToLoad", "onAdClicked", "onAdImpression", "onAdDismissed", "onAdRewarded"]
  }
  
  override func startObserving() {
    hasListeners = true
  }
  
  override func stopObserving() {
    hasListeners = false
  }
  
  @objc(initialize:reject:)
  func initialize(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      YMAMobileAds.shared().setUserConsent(true)
      YMAMobileAds.shared().activate { error in
        if let error = error {
          reject("INIT_ERROR", "Failed to initialize Yandex Mobile Ads: \(error.localizedDescription)", error)
        } else {
          resolve(true)
        }
      }
    }
  }
  
  @objc(showBanner:options:resolve:reject:)
  func showBanner(adUnitId: String, options: [String: Any], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      // Clean up existing banner if any
      self.bannerView?.removeFromSuperview()
      
      // Get the view tag if provided
      let viewTag = options["viewTag"] as? NSNumber
      
      // Create banner size
      let bannerSize = YMAAdSize.flexibleSize(with: CGSize(width: 320, height: 50))
      
      // Create banner view
      self.bannerView = YMAAdView(adUnitID: adUnitId, adSize: bannerSize)
      self.bannerView?.delegate = self
      
      if let viewTag = viewTag {
        // Find the React Native view by tag
        let rootView = UIApplication.shared.keyWindow?.rootViewController?.view
        let bridge = RCTBridge.current()
        let uiManager = bridge?.module(for: RCTUIManager.self) as? RCTUIManager
        
        uiManager?.addUIBlock { (_, viewRegistry) in
          if let containerView = viewRegistry?[viewTag] as? UIView {
            // Add the banner to the container view
            self.bannerView?.frame = containerView.bounds
            self.bannerView?.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            containerView.addSubview(self.bannerView!)
            
            // Load the ad
            self.bannerView?.loadAd()
            resolve(true)
          } else {
            reject("VIEW_NOT_FOUND", "Could not find view with tag \(viewTag)", nil)
          }
        }
      } else {
        // No view tag provided, reject
        reject("INVALID_VIEW_TAG", "View tag is required", nil)
      }
    }
  }
  
  @objc(hideBanner:reject:)
  func hideBanner(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      self.bannerView?.removeFromSuperview()
      self.bannerView = nil
      resolve(true)
    }
  }
  
  @objc(loadInterstitial:resolve:reject:)
  func loadInterstitial(adUnitId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      self.interstitialAd = YMAInterstitialAd(adUnitID: adUnitId)
      self.interstitialAd?.delegate = self
      self.interstitialAd?.load()
      resolve(true)
    }
  }
  
  @objc(showInterstitial:reject:)
  func showInterstitial(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      if let interstitialAd = self.interstitialAd, self.isInterstitialLoaded {
        if let rootViewController = UIApplication.shared.keyWindow?.rootViewController {
          interstitialAd.present(from: rootViewController)
          resolve(true)
        } else {
          reject("NO_ROOT_VIEW", "Could not find root view controller", nil)
        }
      } else {
        reject("NOT_LOADED", "Interstitial ad not loaded", nil)
      }
    }
  }
  
  @objc(isInterstitialLoaded:reject:)
  func isInterstitialLoaded(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    resolve(self.isInterstitialLoaded)
  }
  
  @objc(loadRewarded:resolve:reject:)
  func loadRewarded(adUnitId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      self.rewardedAd = YMARewardedAd(adUnitID: adUnitId)
      self.rewardedAd?.delegate = self
      self.rewardedAd?.load()
      resolve(true)
    }
  }
  
  @objc(showRewarded:reject:)
  func showRewarded(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      if let rewardedAd = self.rewardedAd, self.isRewardedLoaded {
        if let rootViewController = UIApplication.shared.keyWindow?.rootViewController {
          rewardedAd.present(from: rootViewController)
          resolve(true)
        } else {
          reject("NO_ROOT_VIEW", "Could not find root view controller", nil)
        }
      } else {
        reject("NOT_LOADED", "Rewarded ad not loaded", nil)
      }
    }
  }
  
  @objc(isRewardedLoaded:reject:)
  func isRewardedLoaded(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    resolve(self.isRewardedLoaded)
  }
  
  // Required for RCTEventEmitter
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}

// MARK: - YMAAdViewDelegate
extension YandexAdsModule: YMAAdViewDelegate {
  func adViewDidLoad(_ adView: YMAAdView) {
    if hasListeners {
      sendEvent(withName: "onAdLoaded", body: ["type": "banner"])
    }
  }
  
  func adViewDidFailLoading(_ adView: YMAAdView, error: Error) {
    if hasListeners {
      sendEvent(withName: "onAdFailedToLoad", body: ["type": "banner", "error": error.localizedDescription])
    }
  }
  
  func adViewDidClick(_ adView: YMAAdView) {
    if hasListeners {
      sendEvent(withName: "onAdClicked", body: ["type": "banner"])
    }
  }
  
  func adViewWillLeaveApplication(_ adView: YMAAdView) {
    // Not sending an event for this
  }
  
  func adViewDidTrackImpression(_ adView: YMAAdView) {
    if hasListeners {
      sendEvent(withName: "onAdImpression", body: ["type": "banner"])
    }
  }
}

// MARK: - YMAInterstitialAdDelegate
extension YandexAdsModule: YMAInterstitialAdDelegate {
  func interstitialAdDidLoad(_ interstitialAd: YMAInterstitialAd) {
    self.isInterstitialLoaded = true
    if hasListeners {
      sendEvent(withName: "onAdLoaded", body: ["type": "interstitial"])
    }
  }
  
  func interstitialAdDidFailToLoad(_ interstitialAd: YMAInterstitialAd, error: Error) {
    self.isInterstitialLoaded = false
    if hasListeners {
      sendEvent(withName: "onAdFailedToLoad", body: ["type": "interstitial", "error": error.localizedDescription])
    }
  }
  
  func interstitialAdDidClick(_ interstitialAd: YMAInterstitialAd) {
    if hasListeners {
      sendEvent(withName: "onAdClicked", body: ["type": "interstitial"])
    }
  }
  
  func interstitialAdDidShow(_ interstitialAd: YMAInterstitialAd) {
    if hasListeners {
      sendEvent(withName: "onAdImpression", body: ["type": "interstitial"])
    }
  }
  
  func interstitialAdDidDismiss(_ interstitialAd: YMAInterstitialAd) {
    self.isInterstitialLoaded = false
    if hasListeners {
      sendEvent(withName: "onAdDismissed", body: ["type": "interstitial"])
    }
  }
}

// MARK: - YMARewardedAdDelegate
extension YandexAdsModule: YMARewardedAdDelegate {
  func rewardedAdDidLoad(_ rewardedAd: YMARewardedAd) {
    self.isRewardedLoaded = true
    if hasListeners {
      sendEvent(withName: "onAdLoaded", body: ["type": "rewarded"])
    }
  }
  
  func rewardedAdDidFailToLoad(_ rewardedAd: YMARewardedAd, error: Error) {
    self.isRewardedLoaded = false
    if hasListeners {
      sendEvent(withName: "onAdFailedToLoad", body: ["type": "rewarded", "error": error.localizedDescription])
    }
  }
  
  func rewardedAdDidClick(_ rewardedAd: YMARewardedAd) {
    if hasListeners {
      sendEvent(withName: "onAdClicked", body: ["type": "rewarded"])
    }
  }
  
  func rewardedAdDidShow(_ rewardedAd: YMARewardedAd) {
    if hasListeners {
      sendEvent(withName: "onAdImpression", body: ["type": "rewarded"])
    }
  }
  
  func rewardedAdDidDismiss(_ rewardedAd: YMARewardedAd) {
    self.isRewardedLoaded = false
    if hasListeners {
      sendEvent(withName: "onAdDismissed", body: ["type": "rewarded"])
    }
  }
  
  func rewardedAd(_ rewardedAd: YMARewardedAd, didReward reward: YMAReward) {
    if hasListeners {
      sendEvent(withName: "onAdRewarded", body: [
        "type": "rewarded",
        "amount": reward.amount,
        "type": reward.type
      ])
    }
  }
}
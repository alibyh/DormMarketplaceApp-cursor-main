import Foundation
import YandexMobileAds
import React

@objc(YandexAdsModule)
class YandexAdsModule: RCTEventEmitter {
  
  private var hasListeners = false
  private var bannerView: BannerAdView?
  private var interstitialAd: InterstitialAd?
  private var rewardedAd: RewardedAd?
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
      MobileAds.initialize()
      resolve(true)
    }
  }
  
  @objc(showBanner:options:resolve:reject:)
  func showBanner(adUnitId: String, options: [String: Any], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      // Clean up existing banner if any
      self.bannerView?.removeFromSuperview()
      
      // Create banner size
      let bannerSize = BannerAdSize.flexibleSize(with: CGSize(width: 320, height: 50))
      
      // Create banner view
      self.bannerView = BannerAdView(adUnitId: adUnitId, adSize: bannerSize)
      self.bannerView?.delegate = self
      
      // For now, just load the ad without attaching to a specific view
      // The banner will be managed by the delegate callbacks
      self.bannerView?.loadAd()
      resolve(true)
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
      self.interstitialAd = InterstitialAd(adUnitId: adUnitId)
      self.interstitialAd?.delegate = self
      self.interstitialAd?.loadAd()
      resolve(true)
    }
  }
  
  @objc(showInterstitial:reject:)
  func showInterstitial(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      if let interstitialAd = self.interstitialAd, self.isInterstitialLoaded {
        if let rootViewController = UIApplication.shared.keyWindow?.rootViewController {
          interstitialAd.show(from: rootViewController)
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
      self.rewardedAd = RewardedAd(adUnitId: adUnitId)
      self.rewardedAd?.delegate = self
      self.rewardedAd?.loadAd()
      resolve(true)
    }
  }
  
  @objc(showRewarded:reject:)
  func showRewarded(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      if let rewardedAd = self.rewardedAd, self.isRewardedLoaded {
        if let rootViewController = UIApplication.shared.keyWindow?.rootViewController {
          rewardedAd.show(from: rootViewController)
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

// MARK: - BannerAdViewDelegate
extension YandexAdsModule: BannerAdViewDelegate {
  func bannerAdViewDidLoad(_ bannerAdView: BannerAdView) {
    if hasListeners {
      sendEvent(withName: "onAdLoaded", body: ["type": "banner"])
    }
  }
  
  func bannerAdView(_ bannerAdView: BannerAdView, didFailToLoadWithError error: Error) {
    if hasListeners {
      sendEvent(withName: "onAdFailedToLoad", body: ["type": "banner", "error": error.localizedDescription])
    }
  }
  
  func bannerAdViewDidClick(_ bannerAdView: BannerAdView) {
    if hasListeners {
      sendEvent(withName: "onAdClicked", body: ["type": "banner"])
    }
  }
  
  func bannerAdViewWillLeaveApplication(_ bannerAdView: BannerAdView) {
    // Not sending an event for this
  }
  
  func bannerAdViewDidTrackImpression(_ bannerAdView: BannerAdView) {
    if hasListeners {
      sendEvent(withName: "onAdImpression", body: ["type": "banner"])
    }
  }
}

// MARK: - InterstitialAdDelegate
extension YandexAdsModule: InterstitialAdDelegate {
  func interstitialAdDidLoad(_ interstitialAd: InterstitialAd) {
    self.isInterstitialLoaded = true
    if hasListeners {
      sendEvent(withName: "onAdLoaded", body: ["type": "interstitial"])
    }
  }
  
  func interstitialAd(_ interstitialAd: InterstitialAd, didFailToLoadWithError error: Error) {
    self.isInterstitialLoaded = false
    if hasListeners {
      sendEvent(withName: "onAdFailedToLoad", body: ["type": "interstitial", "error": error.localizedDescription])
    }
  }
  
  func interstitialAdDidClick(_ interstitialAd: InterstitialAd) {
    if hasListeners {
      sendEvent(withName: "onAdClicked", body: ["type": "interstitial"])
    }
  }
  
  func interstitialAdDidShow(_ interstitialAd: InterstitialAd) {
    if hasListeners {
      sendEvent(withName: "onAdImpression", body: ["type": "interstitial"])
    }
  }
  
  func interstitialAdDidDismiss(_ interstitialAd: InterstitialAd) {
    self.isInterstitialLoaded = false
    if hasListeners {
      sendEvent(withName: "onAdDismissed", body: ["type": "interstitial"])
    }
  }
  
  func interstitialAdDidTrackImpression(_ interstitialAd: InterstitialAd) {
    if hasListeners {
      sendEvent(withName: "onAdImpression", body: ["type": "interstitial"])
    }
  }
}

// MARK: - RewardedAdDelegate
extension YandexAdsModule: RewardedAdDelegate {
  func rewardedAdDidLoad(_ rewardedAd: RewardedAd) {
    self.isRewardedLoaded = true
    if hasListeners {
      sendEvent(withName: "onAdLoaded", body: ["type": "rewarded"])
    }
  }
  
  func rewardedAd(_ rewardedAd: RewardedAd, didFailToLoadWithError error: Error) {
    self.isRewardedLoaded = false
    if hasListeners {
      sendEvent(withName: "onAdFailedToLoad", body: ["type": "rewarded", "error": error.localizedDescription])
    }
  }
  
  func rewardedAdDidClick(_ rewardedAd: RewardedAd) {
    if hasListeners {
      sendEvent(withName: "onAdClicked", body: ["type": "rewarded"])
    }
  }
  
  func rewardedAdDidShow(_ rewardedAd: RewardedAd) {
    if hasListeners {
      sendEvent(withName: "onAdImpression", body: ["type": "rewarded"])
    }
  }
  
  func rewardedAdDidDismiss(_ rewardedAd: RewardedAd) {
    self.isRewardedLoaded = false
    if hasListeners {
      sendEvent(withName: "onAdDismissed", body: ["type": "rewarded"])
    }
  }
  
  func rewardedAd(_ rewardedAd: RewardedAd, didRewardWith reward: Reward) {
    if hasListeners {
      sendEvent(withName: "onAdRewarded", body: [
        "type": "rewarded",
        "amount": reward.amount,
        "type": reward.type
      ])
    }
  }
  
  func rewardedAdDidTrackImpression(_ rewardedAd: RewardedAd) {
    if hasListeners {
      sendEvent(withName: "onAdImpression", body: ["type": "rewarded"])
    }
  }
}
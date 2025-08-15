package com.yourcompany.dormmarketplace

import android.view.ViewGroup
import android.widget.FrameLayout
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.UIManagerModule
import com.yandex.mobile.ads.banner.BannerAdEventListener
import com.yandex.mobile.ads.banner.BannerAdSize
import com.yandex.mobile.ads.banner.BannerAdView
import com.yandex.mobile.ads.common.*
import com.yandex.mobile.ads.interstitial.InterstitialAd
import com.yandex.mobile.ads.interstitial.InterstitialAdEventListener
import com.yandex.mobile.ads.rewarded.Reward
import com.yandex.mobile.ads.rewarded.RewardedAd
import com.yandex.mobile.ads.rewarded.RewardedAdEventListener

class YandexAdsModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    private var bannerView: BannerAdView? = null
    private var interstitialAd: InterstitialAd? = null
    private var rewardedAd: RewardedAd? = null
    private var isInterstitialLoaded = false
    private var isRewardedLoaded = false

    init {
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String {
        return "YandexAdsModule"
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun initialize(promise: Promise) {
        try {
            MobileAds.initialize(reactContext) {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("INIT_ERROR", "Failed to initialize Yandex Mobile Ads: ${e.message}", e)
        }
    }

    @ReactMethod
    fun showBanner(adUnitId: String, options: ReadableMap, promise: Promise) {
        val currentActivity = currentActivity ?: run {
            promise.reject("NO_ACTIVITY", "Activity is null")
            return
        }

        try {
            // Clean up existing banner if any
            bannerView?.removeAllViews()
            bannerView?.destroy()
            bannerView = null

            // Get the view tag if provided
            val viewTag = options.getDouble("viewTag").toInt()

            currentActivity.runOnUiThread {
                try {
                    // Create a new banner view
                    bannerView = BannerAdView(reactContext)
                    bannerView?.setAdUnitId(adUnitId)
                    bannerView?.setAdSize(BannerAdSize.fixedSize(reactContext, 320, 50))

                    // Set up event listeners
                    bannerView?.setBannerAdEventListener(object : BannerAdEventListener {
                        override fun onAdLoaded() {
                            val params = Arguments.createMap()
                            params.putString("type", "banner")
                            sendEvent("onAdLoaded", params)
                        }

                        override fun onAdFailedToLoad(error: AdRequestError) {
                            val params = Arguments.createMap()
                            params.putString("type", "banner")
                            params.putString("error", error.description)
                            sendEvent("onAdFailedToLoad", params)
                        }

                        override fun onAdClicked() {
                            val params = Arguments.createMap()
                            params.putString("type", "banner")
                            sendEvent("onAdClicked", params)
                        }

                        override fun onLeftApplication() {
                            // Not sending an event for this
                        }

                        override fun onReturnedToApplication() {
                            // Not sending an event for this
                        }

                        override fun onImpression(impressionData: ImpressionData?) {
                            val params = Arguments.createMap()
                            params.putString("type", "banner")
                            sendEvent("onAdImpression", params)
                        }
                    })

                    // Find the React Native view by tag
                    val uiManager = reactContext.getNativeModule(UIManagerModule::class.java)
                    uiManager?.addUIBlock { nativeViewHierarchyManager ->
                        try {
                            val containerView = nativeViewHierarchyManager.resolveView(viewTag) as? ViewGroup
                            if (containerView != null) {
                                // Add the banner to the container view
                                containerView.removeAllViews()
                                val layoutParams = FrameLayout.LayoutParams(
                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                    ViewGroup.LayoutParams.MATCH_PARENT
                                )
                                bannerView?.layoutParams = layoutParams
                                containerView.addView(bannerView)

                                // Load the ad
                                bannerView?.loadAd(AdRequest.Builder().build())
                                promise.resolve(true)
                            } else {
                                promise.reject("VIEW_NOT_FOUND", "Could not find view with tag $viewTag")
                            }
                        } catch (e: Exception) {
                            promise.reject("VIEW_ERROR", "Error adding banner to view: ${e.message}", e)
                        }
                    }
                } catch (e: Exception) {
                    promise.reject("BANNER_ERROR", "Error creating banner: ${e.message}", e)
                }
            }
        } catch (e: Exception) {
            promise.reject("BANNER_ERROR", "Error showing banner: ${e.message}", e)
        }
    }

    @ReactMethod
    fun hideBanner(promise: Promise) {
        currentActivity?.runOnUiThread {
            try {
                bannerView?.removeAllViews()
                bannerView?.destroy()
                bannerView = null
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("BANNER_ERROR", "Error hiding banner: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun loadInterstitial(adUnitId: String, promise: Promise) {
        val currentActivity = currentActivity ?: run {
            promise.reject("NO_ACTIVITY", "Activity is null")
            return
        }

        currentActivity.runOnUiThread {
            try {
                // Clean up existing interstitial if any
                interstitialAd?.destroy()
                interstitialAd = null
                isInterstitialLoaded = false

                // Create a new interstitial ad
                interstitialAd = InterstitialAd(reactContext)
                interstitialAd?.setAdUnitId(adUnitId)

                // Set up event listeners
                interstitialAd?.setInterstitialAdEventListener(object : InterstitialAdEventListener {
                    override fun onAdLoaded() {
                        isInterstitialLoaded = true
                        val params = Arguments.createMap()
                        params.putString("type", "interstitial")
                        sendEvent("onAdLoaded", params)
                    }

                    override fun onAdFailedToLoad(error: AdRequestError) {
                        isInterstitialLoaded = false
                        val params = Arguments.createMap()
                        params.putString("type", "interstitial")
                        params.putString("error", error.description)
                        sendEvent("onAdFailedToLoad", params)
                    }

                    override fun onAdShown() {
                        val params = Arguments.createMap()
                        params.putString("type", "interstitial")
                        sendEvent("onAdImpression", params)
                    }

                    override fun onAdDismissed() {
                        isInterstitialLoaded = false
                        val params = Arguments.createMap()
                        params.putString("type", "interstitial")
                        sendEvent("onAdDismissed", params)
                    }

                    override fun onAdClicked() {
                        val params = Arguments.createMap()
                        params.putString("type", "interstitial")
                        sendEvent("onAdClicked", params)
                    }

                    override fun onLeftApplication() {
                        // Not sending an event for this
                    }

                    override fun onReturnedToApplication() {
                        // Not sending an event for this
                    }

                    override fun onImpression(impressionData: ImpressionData?) {
                        // Already handled in onAdShown
                    }
                })

                // Load the ad
                interstitialAd?.loadAd(AdRequest.Builder().build())
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("INTERSTITIAL_ERROR", "Error loading interstitial: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun showInterstitial(promise: Promise) {
        val currentActivity = currentActivity ?: run {
            promise.reject("NO_ACTIVITY", "Activity is null")
            return
        }

        currentActivity.runOnUiThread {
            try {
                if (interstitialAd != null && isInterstitialLoaded) {
                    interstitialAd?.show()
                    promise.resolve(true)
                } else {
                    promise.reject("NOT_LOADED", "Interstitial ad not loaded")
                }
            } catch (e: Exception) {
                promise.reject("INTERSTITIAL_ERROR", "Error showing interstitial: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun isInterstitialLoaded(promise: Promise) {
        promise.resolve(isInterstitialLoaded)
    }

    @ReactMethod
    fun loadRewarded(adUnitId: String, promise: Promise) {
        val currentActivity = currentActivity ?: run {
            promise.reject("NO_ACTIVITY", "Activity is null")
            return
        }

        currentActivity.runOnUiThread {
            try {
                // Clean up existing rewarded if any
                rewardedAd?.destroy()
                rewardedAd = null
                isRewardedLoaded = false

                // Create a new rewarded ad
                rewardedAd = RewardedAd(reactContext)
                rewardedAd?.setAdUnitId(adUnitId)

                // Set up event listeners
                rewardedAd?.setRewardedAdEventListener(object : RewardedAdEventListener {
                    override fun onAdLoaded() {
                        isRewardedLoaded = true
                        val params = Arguments.createMap()
                        params.putString("type", "rewarded")
                        sendEvent("onAdLoaded", params)
                    }

                    override fun onAdFailedToLoad(error: AdRequestError) {
                        isRewardedLoaded = false
                        val params = Arguments.createMap()
                        params.putString("type", "rewarded")
                        params.putString("error", error.description)
                        sendEvent("onAdFailedToLoad", params)
                    }

                    override fun onAdShown() {
                        val params = Arguments.createMap()
                        params.putString("type", "rewarded")
                        sendEvent("onAdImpression", params)
                    }

                    override fun onAdDismissed() {
                        isRewardedLoaded = false
                        val params = Arguments.createMap()
                        params.putString("type", "rewarded")
                        sendEvent("onAdDismissed", params)
                    }

                    override fun onAdClicked() {
                        val params = Arguments.createMap()
                        params.putString("type", "rewarded")
                        sendEvent("onAdClicked", params)
                    }

                    override fun onLeftApplication() {
                        // Not sending an event for this
                    }

                    override fun onReturnedToApplication() {
                        // Not sending an event for this
                    }

                    override fun onImpression(impressionData: ImpressionData?) {
                        // Already handled in onAdShown
                    }

                    override fun onRewarded(reward: Reward) {
                        val params = Arguments.createMap()
                        params.putString("type", "rewarded")
                        params.putInt("amount", reward.amount)
                        params.putString("type", reward.type)
                        sendEvent("onAdRewarded", params)
                    }
                })

                // Load the ad
                rewardedAd?.loadAd(AdRequest.Builder().build())
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("REWARDED_ERROR", "Error loading rewarded: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun showRewarded(promise: Promise) {
        val currentActivity = currentActivity ?: run {
            promise.reject("NO_ACTIVITY", "Activity is null")
            return
        }

        currentActivity.runOnUiThread {
            try {
                if (rewardedAd != null && isRewardedLoaded) {
                    rewardedAd?.show()
                    promise.resolve(true)
                } else {
                    promise.reject("NOT_LOADED", "Rewarded ad not loaded")
                }
            } catch (e: Exception) {
                promise.reject("REWARDED_ERROR", "Error showing rewarded: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun isRewardedLoaded(promise: Promise) {
        promise.resolve(isRewardedLoaded)
    }

    override fun onHostResume() {
        // Nothing to do
    }

    override fun onHostPause() {
        // Nothing to do
    }

    override fun onHostDestroy() {
        bannerView?.destroy()
        bannerView = null
        interstitialAd?.destroy()
        interstitialAd = null
        rewardedAd?.destroy()
        rewardedAd = null
    }
}
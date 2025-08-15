package com.yourcompany.dormmarketplace

import android.util.Log
import com.yandex.mobile.ads.banner.BannerAdEventListener
import com.yandex.mobile.ads.banner.BannerAdSize
import com.yandex.mobile.ads.banner.BannerAdView
import com.yandex.mobile.ads.common.AdRequest
import com.yandex.mobile.ads.common.AdRequestError
import com.yandex.mobile.ads.common.ImpressionData
import com.yandex.mobile.ads.common.MobileAds
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class YandexAdsModule : Module() {
    private val TAG = "YandexAdsModule"
    private var bannerAdView: BannerAdView? = null

    override fun definition() = ModuleDefinition {
        Name("YandexAdsModule")

        AsyncFunction("initializeSDK") { promise ->
            try {
                Log.d(TAG, "Initializing Yandex Mobile Ads SDK")
                MobileAds.initialize(appContext.reactContext!!) {
                    Log.d(TAG, "Yandex Mobile Ads SDK initialized successfully")
                    promise.resolve(true)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to initialize Yandex Mobile Ads SDK", e)
                promise.reject("INIT_ERROR", "Failed to initialize Yandex Mobile Ads: ${e.message}")
            }
        }

        AsyncFunction("loadBanner") { adUnitId: String, promise ->
            try {
                Log.d(TAG, "Loading banner ad with ID: $adUnitId")
                
                appContext.reactContext?.currentActivity?.runOnUiThread {
                    try {
                        // Create a banner ad view
                        bannerAdView = BannerAdView(appContext.reactContext).apply {
                            setAdUnitId(adUnitId)
                            setAdSize(BannerAdSize.fixedSize(appContext.reactContext, 320, 50))
                            setBannerAdEventListener(object : BannerAdEventListener {
                                override fun onAdLoaded() {
                                    Log.d(TAG, "Banner ad loaded successfully")
                                    promise.resolve(true)
                                }

                                override fun onAdFailedToLoad(error: AdRequestError) {
                                    Log.e(TAG, "Banner ad failed to load: ${error.description}")
                                    promise.reject("BANNER_ERROR", "Failed to load banner: ${error.description}")
                                }

                                override fun onAdClicked() {
                                    Log.d(TAG, "Banner ad clicked")
                                }

                                override fun onLeftApplication() {
                                    Log.d(TAG, "Banner ad left application")
                                }

                                override fun onReturnedToApplication() {
                                    Log.d(TAG, "Banner ad returned to application")
                                }

                                override fun onImpression(impressionData: ImpressionData?) {
                                    Log.d(TAG, "Banner ad impression recorded")
                                }
                            })
                        }

                        // Load the ad
                        bannerAdView?.loadAd(AdRequest.Builder().build())
                    } catch (e: Exception) {
                        Log.e(TAG, "Error creating banner ad view", e)
                        promise.reject("BANNER_ERROR", "Error creating banner ad view: ${e.message}")
                    }
                } ?: run {
                    Log.e(TAG, "Activity is null")
                    promise.reject("ACTIVITY_ERROR", "Activity is null")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to load banner ad", e)
                promise.reject("BANNER_ERROR", "Failed to load banner ad: ${e.message}")
            }
        }
    }
}

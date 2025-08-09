package com.yandexmobileads

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.yandexmobileads.app_open.YandexAppOpenAdModule
import com.yandexmobileads.banner.YandexBannerAdSizeModule
import com.yandexmobileads.banner.YandexBannerViewManager
import com.yandexmobileads.interstitial.YandexInterstitialAdModule
import com.yandexmobileads.rewarded.YandexRewardedAdModule

class YandexMobileAdsPackage : ReactPackage {
    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): MutableList<ViewManager<*, *>> = mutableListOf(
        YandexBannerViewManager(reactContext),
    )

    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): MutableList<NativeModule> = mutableListOf(
        YandexMobileAdsModule(reactContext),
        YandexInterstitialAdModule(reactContext),
        YandexRewardedAdModule(reactContext),
        YandexAppOpenAdModule(reactContext),
        YandexBannerAdSizeModule(reactContext),
    )
}

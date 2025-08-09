package com.yandexmobileads

import com.facebook.react.bridge.ReactApplicationContext
import com.yandexmobileads.banner.YandexBannerAdSizeModule
import com.yandexmobileads.banner.YandexBannerViewManager
import com.yandexmobileads.interstitial.YandexInterstitialAdModule
import io.mockk.mockk
import org.junit.Assert
import org.junit.Test

class YandexMobileAdsPackageTest {
    private val reactContext: ReactApplicationContext = mockk()
    private val yandexMobileAdsPackage = YandexMobileAdsPackage()

    @Test
    fun createViewManagers() {
        val viewManagers = yandexMobileAdsPackage.createViewManagers(reactContext)
        val mobileAdsViewManagers = viewManagers.filterIsInstance<YandexBannerViewManager>()
        Assert.assertEquals(1, mobileAdsViewManagers.size)
    }

    @Test
    fun createNativeModulesCreatesMobileAdsModule() {
        val modules = yandexMobileAdsPackage.createNativeModules(reactContext)

        val mobileAdsModules = modules.filterIsInstance<YandexMobileAdsModule>()
        Assert.assertEquals(1, mobileAdsModules.size)
    }

    @Test
    fun createNativeModulesCreatesInterstitialModule() {
        val modules = yandexMobileAdsPackage.createNativeModules(reactContext)

        val mobileAdsModules = modules.filterIsInstance<YandexInterstitialAdModule>()
        Assert.assertEquals(1, mobileAdsModules.size)
    }

    @Test
    fun createNativeModulesCreatesBannerAdSizeModule() {
        val modules = yandexMobileAdsPackage.createNativeModules(reactContext)

        val mobileAdsModules = modules.filterIsInstance<YandexBannerAdSizeModule>()
        Assert.assertEquals(1, mobileAdsModules.size)
    }
}

package com.yandexmobileads

import android.app.Activity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.yandex.mobile.ads.common.InitializationListener
import com.yandex.mobile.ads.common.MobileAds
import io.mockk.Runs
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.slot
import io.mockk.unmockkAll
import io.mockk.verify
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class YandexMobileAdsModuleTest {
    private val reactContext: ReactApplicationContext = mockk()
    private val reactNativeYandexMobileAdsModule = YandexMobileAdsModule(reactContext)
    private val promise: Promise = mockk(relaxed = true)

    @Before
    fun setUp() {
        mockkStatic(MobileAds::class)
        every { MobileAds.libraryVersion } returns MOBILE_ADS_VERSION
    }

    @After
    fun tearDown() {
        unmockkAll()
    }

    @Test
    fun getName() {
        val name = reactNativeYandexMobileAdsModule.name

        assertEquals(NAME, name)
    }

    @Test
    fun getLibraryVersion() {
        reactNativeYandexMobileAdsModule.getLibraryVersion(promise)

        verify {
            promise.resolve(MOBILE_ADS_VERSION)
        }
    }

    @Test
    fun showDebugPanelWhileCurrentActivityIsNull() {
        every { reactContext.currentActivity } returns null
        val errorCodeSlot = slot<String>()
        val errorMessageSlot = slot<String>()
        every {
            promise.reject(capture(errorCodeSlot), capture(errorMessageSlot))
        } answers { callOriginal() }

        reactNativeYandexMobileAdsModule.showDebugPanel(promise)

        assertEquals(errorCodeSlot.captured, ERROR_CODE_INTERNAL_ERROR)
        assertEquals(errorMessageSlot.captured, ERROR_MESSAGE_ACTIVITY_IS_NULL)
    }

    @Test
    fun showDebugPanel() {
        val activity =
            mockk<Activity>(relaxed = true) {
                every { runOnUiThread(any()) } answers { firstArg<Runnable>().run() }
            }
        every { reactContext.currentActivity } returns activity
        every { MobileAds.showDebugPanel(activity) } just Runs

        reactNativeYandexMobileAdsModule.showDebugPanel(promise)
        verify { promise.resolve(null) }
    }

    @Test
    fun enableDebugErrorIndicator() {
        reactNativeYandexMobileAdsModule.enableDebugErrorIndicator(true)

        verify { MobileAds.enableDebugErrorIndicator(true) }
    }

    @Test
    fun enableLogging() {
        reactNativeYandexMobileAdsModule.setLogging(true)

        verify { MobileAds.enableLogging(true) }
    }

    @Test
    fun setLocationConsent() {
        reactNativeYandexMobileAdsModule.setLocationConsent(true)

        verify { MobileAds.setLocationConsent(true) }
    }

    @Test
    fun setAgeRestrictedUser() {
        reactNativeYandexMobileAdsModule.setAgeRestrictedUser(true)

        verify { MobileAds.setAgeRestrictedUser(true) }
    }

    @Test
    fun setUserConsent() {
        reactNativeYandexMobileAdsModule.setUserConsent(true)

        verify { MobileAds.setUserConsent(true) }
    }

    @Test
    fun initialize() {
        every {
            MobileAds.initialize(reactContext, any())
        } answers {
            secondArg<InitializationListener>().onInitializationCompleted()
        }
        reactNativeYandexMobileAdsModule.initializeSdk(promise)
        verify { promise.resolve(null) }
    }

    companion object {
        private const val NAME = "RNYandexMobileAds"
        private const val MOBILE_ADS_VERSION = "1.0.0"
        private const val ERROR_CODE_INTERNAL_ERROR = "Internal error"
        private const val ERROR_MESSAGE_ACTIVITY_IS_NULL = "Current activity is null!"
    }
}

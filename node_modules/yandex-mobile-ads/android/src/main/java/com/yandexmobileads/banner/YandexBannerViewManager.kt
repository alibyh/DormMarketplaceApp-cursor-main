package com.yandexmobileads.banner

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.yandexmobileads.common.Constants
import com.yandexmobileads.util.factory.AdRequestFactory
import com.yandexmobileads.util.factory.TypedBannerAdSizeFactory

class YandexBannerViewManager internal constructor(
    context: ReactApplicationContext,
    private val bannerAdSizeFactory: TypedBannerAdSizeFactory = TypedBannerAdSizeFactory(context),
    private val adRequestFactory: AdRequestFactory = AdRequestFactory(),
) : SimpleViewManager<YandexBannerView>() {
    override fun getName(): String = NAME

    override fun createViewInstance(reactContext: ThemedReactContext): YandexBannerView =
        YandexBannerView(reactContext)

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> = mapOf(
        createCustomDirectEventTypeConstant(Constants.EventName.ON_AD_CLICKED),
        createCustomDirectEventTypeConstant(Constants.EventName.ON_AD_FAILED_TO_LOAD),
        createCustomDirectEventTypeConstant(Constants.EventName.ON_AD_LOADED),
        createCustomDirectEventTypeConstant(Constants.EventName.ON_AD_IMPRESSION),
        createCustomDirectEventTypeConstant(Constants.EventName.ON_LEFT_APPLICATION),
        createCustomDirectEventTypeConstant(Constants.EventName.ON_RETURN_TO_APPLICATION),
        createCustomDirectEventTypeConstant(Constants.EventName.ON_AD_CLOSE)
    )

    @ReactProp(name = "adSize")
    fun setAdSize(
        view: YandexBannerView,
        size: ReadableMap?,
    ) {
        val adSize = size?.let(bannerAdSizeFactory::createFromReadableMap) ?: return
        view.setSize(adSize.bannerAdSize)
    }

    @ReactProp(name = "adRequest")
    fun setAdRequest(
        view: YandexBannerView,
        adRequest: ReadableMap?
    ) {
        val adUnitId = adRequest?.getString(Constants.Key.AD_UNIT_ID) ?: return
        val nativeAdRequest = adRequest.let(adRequestFactory::createFromReadableMap)
        view.setAdUnitIdAndAdRequest(adUnitId, nativeAdRequest)
    }

    private fun createCustomDirectEventTypeConstant(name: String) =
        name to hashMapOf(REACT_EVENT_REGISTRATION_KEY to name)

    companion object {
        private const val NAME = "BannerView"
        private const val REACT_EVENT_REGISTRATION_KEY = "registrationName"
    }
}

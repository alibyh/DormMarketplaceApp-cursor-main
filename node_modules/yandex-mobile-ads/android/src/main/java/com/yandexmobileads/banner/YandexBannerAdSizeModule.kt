package com.yandexmobileads.banner

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.yandexmobileads.common.NativeMapFactory
import com.yandexmobileads.util.factory.TypedBannerAdSizeFactory
import com.yandexmobileads.util.mapper.TypedBannerAdSizeMapper

class YandexBannerAdSizeModule internal constructor(
    private val reactContext: ReactApplicationContext,
    private val nativeMapFactory: NativeMapFactory = NativeMapFactory(),
    private val adSizeFactory: TypedBannerAdSizeFactory = TypedBannerAdSizeFactory(reactContext),
    private val typeAdSizeMapper: TypedBannerAdSizeMapper = TypedBannerAdSizeMapper(reactContext),
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "YandexBannerAdSizeModule"

    @ReactMethod
    fun createStickyBannerSize(
        width: Int,
        promise: Promise,
    ) {
        adSizeFactory.createSticky(width)
            .let(typeAdSizeMapper::map)
            .let(nativeMapFactory::createWritableMap)
            .let(promise::resolve)
    }

    @ReactMethod
    fun createInlineBannerSize(
        width: Int,
        maxHeight: Int,
        promise: Promise,
    ) {
        adSizeFactory.createInline(width, maxHeight)
            .let(typeAdSizeMapper::map)
            .let(nativeMapFactory::createWritableMap)
            .let(promise::resolve)
    }
}

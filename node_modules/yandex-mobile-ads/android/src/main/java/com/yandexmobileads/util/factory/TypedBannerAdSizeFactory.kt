package com.yandexmobileads.util.factory

import android.content.Context
import com.facebook.react.bridge.ReadableMap
import com.yandex.mobile.ads.banner.BannerAdSize
import com.yandexmobileads.banner.TypedBannerAdSize
import com.yandexmobileads.common.Constants

internal class TypedBannerAdSizeFactory(
    private val context: Context,
) {

    fun createSticky(width: Int): TypedBannerAdSize {
        val bannerAdSize = BannerAdSize.stickySize(context, width)
        return TypedBannerAdSize(bannerAdSize, Constants.BannerType.STICKY)
    }

    fun createInline(width: Int, maxHeight: Int): TypedBannerAdSize {
        val bannerAdSize = BannerAdSize.inlineSize(context, width, maxHeight)
        return TypedBannerAdSize(bannerAdSize, Constants.BannerType.INLINE)
    }

    fun createFromReadableMap(readableMap: ReadableMap): TypedBannerAdSize? {
        val type = readableMap.getString(Constants.Key.BANNER_TYPE)
        return when (type) {
            Constants.BannerType.STICKY -> {
                if (readableMap.hasKey(Constants.Key.INITIAL_WIDTH).not()) {
                    return null
                }
                val width = readableMap.getInt(Constants.Key.INITIAL_WIDTH)
                createSticky(width)
            }

            Constants.BannerType.INLINE -> {
                if (readableMap.hasKey(Constants.Key.INITIAL_WIDTH).not()) {
                    return null
                }
                if (readableMap.hasKey(Constants.Key.INITIAL_HEIGHT).not()) {
                    return null
                }
                val width = readableMap.getInt(Constants.Key.INITIAL_WIDTH)
                val maxHeight = readableMap.getInt(Constants.Key.INITIAL_HEIGHT)
                createInline(width, maxHeight)
            }

            else -> null
        }
    }
}

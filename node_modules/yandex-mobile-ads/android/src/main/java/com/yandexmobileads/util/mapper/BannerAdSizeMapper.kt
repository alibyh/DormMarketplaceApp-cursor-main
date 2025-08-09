package com.yandexmobileads.util.mapper

import android.content.Context
import com.yandex.mobile.ads.banner.BannerAdSize
import com.yandexmobileads.common.Constants

internal class BannerAdSizeMapper(
    private val context: Context
) {
    fun map(bannerAdSize: BannerAdSize): Map<String, Any> = mapOf(
        Constants.Key.INITIAL_WIDTH to bannerAdSize.width,
        Constants.Key.INITIAL_HEIGHT to bannerAdSize.height,
        KEY_WIDTH to bannerAdSize.getWidth(context),
        KEY_HEIGHT to bannerAdSize.getHeight(context),
        KEY_WIDTH_PX to bannerAdSize.getWidthInPixels(context),
        KEY_HEIGHT_PX to bannerAdSize.getHeightInPixels(context),
    )

    companion object {
        const val KEY_WIDTH = "width"
        const val KEY_HEIGHT = "height"
        const val KEY_WIDTH_PX = "widthInPixels"
        const val KEY_HEIGHT_PX = "heightInPixels"
    }
}

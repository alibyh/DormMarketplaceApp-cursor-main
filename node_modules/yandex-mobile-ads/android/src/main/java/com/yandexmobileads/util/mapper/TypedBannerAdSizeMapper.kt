package com.yandexmobileads.util.mapper

import android.content.Context
import com.yandexmobileads.banner.TypedBannerAdSize
import com.yandexmobileads.common.Constants

internal class TypedBannerAdSizeMapper(
    context: Context,
    private val bannerAdSizeMapper: BannerAdSizeMapper = BannerAdSizeMapper(context),
) {

    fun map(bannerAdSize: TypedBannerAdSize): Map<String, Any> {
        val result = bannerAdSizeMapper.map(bannerAdSize.bannerAdSize).toMutableMap()
        result[Constants.Key.BANNER_TYPE] = bannerAdSize.type
        return result
    }
}

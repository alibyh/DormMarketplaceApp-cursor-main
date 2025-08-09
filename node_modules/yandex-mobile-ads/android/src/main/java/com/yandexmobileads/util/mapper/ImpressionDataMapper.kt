package com.yandexmobileads.util.mapper

import com.yandex.mobile.ads.common.ImpressionData

internal class ImpressionDataMapper {

    fun map(impressionData: ImpressionData): Map<String, Any> = mapOf(
        KEY_RAW_DATA to impressionData.rawData
    )

    companion object {
        private const val KEY_RAW_DATA = "rawData"
    }
}

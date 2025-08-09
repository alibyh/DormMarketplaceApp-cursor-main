package com.yandexmobileads.util.mapper

import com.yandex.mobile.ads.common.AdError

internal class AdErrorMapper {
    fun map(adError: AdError): Map<String, Any> = mapOf(
        KEY_DESCRIPTION to adError.description,
    )

    companion object {
        private const val KEY_DESCRIPTION = "description"
    }
}

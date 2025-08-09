package com.yandexmobileads.util.mapper

import com.yandex.mobile.ads.common.AdRequestError

internal class AdRequestErrorMapper {
    fun map(adRequestError: AdRequestError): Map<String, Any> {
        val result = mutableMapOf(
            KEY_CODE to adRequestError.code,
            KEY_DESCRIPTION to adRequestError.description,
        )
        adRequestError.adUnitId?.let { result[AD_UNIT_ID] = it }

        return result
    }

    companion object {
        private const val KEY_CODE = "code"
        private const val KEY_DESCRIPTION = "description"
        private const val AD_UNIT_ID = "adUnitId"
    }
}

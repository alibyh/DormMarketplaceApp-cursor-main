package com.yandexmobileads.util

internal class EventNameProvider {
    fun eventName(adType: String, event: String): String {
        val eventName = "$COMMON_PREFIX-$adType-$event"
        return eventName
    }

    companion object {
        private const val COMMON_PREFIX = "RNYandexMobileAds"
    }
}

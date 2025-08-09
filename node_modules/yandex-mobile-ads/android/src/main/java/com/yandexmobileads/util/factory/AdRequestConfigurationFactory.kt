package com.yandexmobileads.util.factory

import com.facebook.react.bridge.ReadableMap
import com.yandex.mobile.ads.common.AdRequestConfiguration
import com.yandex.mobile.ads.common.Gender
import com.yandex.mobile.ads.common.AdTheme
import com.yandexmobileads.common.Constants
import com.yandexmobileads.util.Converter

internal class AdRequestConfigurationFactory(
    private val locationFactory: LocationFactory = LocationFactory(),
    private val converter: Converter = Converter(),
) {
    fun createFromReadableMap(readableMap: ReadableMap): AdRequestConfiguration? {
        val adUnitId = readableMap.getString(Constants.Key.AD_UNIT_ID) ?: return null

        val adRequestConfiguration = AdRequestConfiguration.Builder(adUnitId)

        adRequestConfiguration.setAge(readableMap.getString(Constants.Key.AGE))
        adRequestConfiguration.setLocation(
            locationFactory.createFromReadableMap(
                readableMap.getMap(Constants.Key.LOCATION)
            )
        )
        adRequestConfiguration.setContextQuery(readableMap.getString(Constants.Key.CONTEXT_QUERY))
        adRequestConfiguration.setContextTags(
            converter.convertReadableArrayToList(
                readableMap.getArray(
                    Constants.Key.CONTEXT_TAGS
                )
            )
        )
        adRequestConfiguration.setGender(
            when (readableMap.getString(Constants.Key.GENDER)) {
                Constants.Gender.MALE -> Gender.MALE
                Constants.Gender.FEMALE -> Gender.FEMALE
                else -> null
            }
        )
        adRequestConfiguration.setPreferredTheme(
            when (readableMap.getString(Constants.Key.AD_THEME)) {
                Constants.AdTheme.LIGHT -> AdTheme.LIGHT
                Constants.AdTheme.DARK -> AdTheme.DARK
                else -> null
            }
        )
        adRequestConfiguration.setBiddingData(readableMap.getString(Constants.Key.BIDDING_DATA))
        adRequestConfiguration.setParameters(
            converter.convertReadableMapToMap(
                readableMap.getMap(Constants.Key.PARAMETERS)
            )
        )

        return adRequestConfiguration.build()
    }
}

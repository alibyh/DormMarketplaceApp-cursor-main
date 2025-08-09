package com.yandexmobileads.util.factory

import com.facebook.react.bridge.ReadableMap
import com.yandex.mobile.ads.common.AdRequest
import com.yandex.mobile.ads.common.Gender
import com.yandex.mobile.ads.common.AdTheme
import com.yandexmobileads.common.Constants
import com.yandexmobileads.util.Converter

internal class AdRequestFactory(
    private val locationFactory: LocationFactory = LocationFactory(),
    private val converter: Converter = Converter(),
) {
    fun createFromReadableMap(readableMap: ReadableMap): AdRequest {
        val adRequest = AdRequest.Builder()

        adRequest.setAge(readableMap.getString(Constants.Key.AGE))
        adRequest.setLocation(
            locationFactory.createFromReadableMap(
                readableMap.getMap(Constants.Key.LOCATION)
            )
        )
        adRequest.setContextQuery(readableMap.getString(Constants.Key.CONTEXT_QUERY))
        adRequest.setContextTags(
            converter.convertReadableArrayToList(
                readableMap.getArray(
                    Constants.Key.CONTEXT_TAGS
                )
            )
        )
        adRequest.setGender(
            when (readableMap.getString(Constants.Key.GENDER)) {
                Constants.Gender.MALE -> Gender.MALE
                Constants.Gender.FEMALE -> Gender.FEMALE
                else -> null
            }
        )
        adRequest.setPreferredTheme(
            when (readableMap.getString(Constants.Key.AD_THEME)) {
                Constants.AdTheme.LIGHT -> AdTheme.LIGHT
                Constants.AdTheme.DARK -> AdTheme.DARK
                else -> null
            }
        )
        val biddingData = readableMap.getString(Constants.Key.BIDDING_DATA)
        if (biddingData.isNullOrEmpty().not()) {
            adRequest.setBiddingData(biddingData)
        }
        adRequest.setParameters(
            converter.convertReadableMapToMap(
                readableMap.getMap(Constants.Key.PARAMETERS)
            )
        )

        return adRequest.build()
    }
}

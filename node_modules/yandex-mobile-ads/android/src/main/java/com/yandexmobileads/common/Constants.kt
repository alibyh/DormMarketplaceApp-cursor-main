package com.yandexmobileads.common

internal object Constants {
    object AdType {
        const val INTERSTITIAL = "Interstitial"
        const val REWARDED = "Rewarded"
        const val APP_OPEN = "AppOpen"
    }

    object EventName {
        const val ON_AD_LOADED = "onAdLoaded"
        const val ON_AD_FAILED_TO_LOAD = "onAdFailedToLoad"

        const val ON_AD_SHOWN = "onAdShown"
        const val ON_AD_FAILED_TO_SHOW = "onAdFailedToShow"
        const val ON_AD_IMPRESSION = "onAdImpression"
        const val ON_AD_CLICKED = "onAdClicked"
        const val ON_AD_DISMISSED = "onAdDismissed"
        const val ON_AD_DID_REWARD = "onAdDidReward"

        const val ON_LEFT_APPLICATION = "onLeftApplication"
        const val ON_RETURN_TO_APPLICATION = "onReturnToApplication"
        const val ON_AD_CLOSE = "onAdClose"

        const val ON_AD_DELETED = "onAdDeleted"
    }

    object BannerType {
        const val STICKY = "sticky"
        const val INLINE = "inline"
    }

    object Key {
        const val BANNER_TYPE = "type"
        const val INITIAL_WIDTH = "initialWidth"
        const val INITIAL_HEIGHT = "initialHeight"
        const val AD_ID = "adId"
        const val LOADER_ID = "loaderId"
        const val REWARD = "reward"
        const val IMPRESSION_DATA = "impressionData"
        const val ERROR = "error"

        const val AD_UNIT_ID = "_adUnitId"
        const val AGE = "_age"
        const val CONTEXT_QUERY = "_contextQuery"
        const val CONTEXT_TAGS = "_contextTags"
        const val GENDER = "_gender"
        const val LOCATION = "_location"
        const val AD_THEME = "_adTheme"
        const val BIDDING_DATA = "_biddingData"
        const val PARAMETERS = "_parameters"

        const val LATITUDE = "_latitude"
        const val LONGITUDE = "_longitude"
    }

    object Gender {
        const val MALE = "Male"
        const val FEMALE = "Female"
    }

    object AdTheme {
        const val LIGHT = "Light"
        const val DARK = "Dark"
    }

    object Error {
        const val CODE_INTERNAL_ERROR = "Internal error"
        const val CODE_INVALID_AD_REQUEST_CONFIGURATION = "Invalid AdRequestConfiguration"

        const val MESSAGE_OBJECT_NOT_FOUND = "Object with provided id was not found"
        const val MESSAGE_NULL_ACTIVITY = "Current activity is null!"
        const val MESSAGE_INVALID_AD_REQUEST_CONFIGURATION = "Unable to create native AdRequestConfiguration"
    }
}

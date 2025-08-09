package com.yandexmobileads.util.factory

import android.location.Location
import com.facebook.react.bridge.ReadableMap
import com.yandexmobileads.common.Constants

class LocationFactory {
    fun createFromReadableMap(readableMap: ReadableMap?): Location? {
        return readableMap?.let { map ->
            val location = Location("factory")
            location.latitude = map.getDouble(Constants.Key.LATITUDE)
            location.longitude = map.getDouble(Constants.Key.LONGITUDE)
            return location
        }
    }
}

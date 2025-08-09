package com.yandexmobileads.common

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

internal class NativeMapFactory {
    fun createWritableMap(map: Map<String, Any?>): WritableMap = Arguments.makeNativeMap(map)
}

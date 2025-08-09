package com.yandexmobileads.util

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap

class Converter {
    fun convertReadableArrayToList(array: ReadableArray?): List<String>? {
        @Suppress("UselessCallOnCollection")
        return array?.let { readableArray ->
            List(readableArray.size()) { index -> readableArray.getString(index) }
        }?.filterNotNull()
    }

    fun convertReadableMapToMap(map: ReadableMap?): Map<String, String>? {
        return map?.let { readableMap ->
            val result = mutableMapOf<String, String>()
            val iterator = readableMap.keySetIterator()
            while (iterator.hasNextKey()) {
                val key = iterator.nextKey()
                result[key] = readableMap.getString(key) ?: ""
            }
            result
        }
    }
}

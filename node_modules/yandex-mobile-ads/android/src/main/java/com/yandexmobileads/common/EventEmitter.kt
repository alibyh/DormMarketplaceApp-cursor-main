package com.yandexmobileads.common

import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.events.RCTEventEmitter

internal class EventEmitter(
    private val context: ReactContext,
    private val nativeMapFactory: NativeMapFactory,
) {
    fun emit(
        event: String,
        payload: Map<String, Any>? = null,
    ) {
        context
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, payload?.let(nativeMapFactory::createWritableMap))
    }

    fun receiveEvent(
        id: Int,
        event: String,
        payload: Map<String, Any>? = null,
    ) {
        context
            .getJSModule<RCTEventEmitter>(RCTEventEmitter::class.java)
            .receiveEvent(id, event, payload?.let(nativeMapFactory::createWritableMap))
    }
}

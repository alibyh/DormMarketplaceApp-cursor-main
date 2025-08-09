package com.yandexmobileads.common

import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.Test

class EventEmitterTest {
    private val eventEmitterJsModule: RCTDeviceEventEmitter = mockk(relaxed = true)
    private val reactContext: ReactApplicationContext =
        mockk {
            every {
                getJSModule(RCTDeviceEventEmitter::class.java)
            } returns eventEmitterJsModule
        }

    private val writableMap = JavaOnlyMap()
    private val nativeMapFactory: NativeMapFactory =
        mockk {
            every { createWritableMap(mapOf(PAYLOAD_KEY to PAYLOAD_VALUE)) } returns writableMap
        }
    private val eventEmitter = EventEmitter(reactContext, nativeMapFactory)

    @Test
    fun emitWithPayload() {
        val payload =
            mapOf(
                PAYLOAD_KEY to PAYLOAD_VALUE,
            )
        eventEmitter.emit(EVENT, payload)

        verify {
            eventEmitterJsModule.emit(EVENT, writableMap)
        }
    }

    @Test
    fun emitWithoutPayload() {
        eventEmitter.emit(EVENT)

        verify {
            eventEmitterJsModule.emit(EVENT, null)
        }
    }

    companion object {
        private const val EVENT = "event"
        private const val PAYLOAD_KEY = "key"
        private const val PAYLOAD_VALUE = "value"
    }
}

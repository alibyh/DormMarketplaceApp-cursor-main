package com.yandexmobileads.common

import com.facebook.react.bridge.Promise

internal sealed class PluginError(
    val code: String,
    val message: String?,
    val cause: Throwable? = null
) {
    @Suppress("ConvertObjectToDataObject")
    object CurrentActivityIsNull : PluginError(
        Constants.Error.CODE_INTERNAL_ERROR,
        Constants.Error.MESSAGE_NULL_ACTIVITY
    )

    @Suppress("ConvertObjectToDataObject")
    object ObjectNotFound: PluginError(
        Constants.Error.CODE_INTERNAL_ERROR,
        Constants.Error.MESSAGE_OBJECT_NOT_FOUND
    )

    @Suppress("ConvertObjectToDataObject")
    object InvalidAdRequestConfigurationError: PluginError(
        Constants.Error.CODE_INVALID_AD_REQUEST_CONFIGURATION,
        Constants.Error.MESSAGE_INVALID_AD_REQUEST_CONFIGURATION
    )
}

internal fun Promise.reject(
    customError: PluginError
) = reject(
    customError.code,
    customError.message,
    customError.cause
)

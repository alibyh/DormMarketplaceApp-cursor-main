package com.yandexmobileads.banner

import android.annotation.SuppressLint
import android.widget.FrameLayout
import androidx.annotation.VisibleForTesting
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.ThemedReactContext
import com.yandex.mobile.ads.banner.BannerAdSize
import com.yandex.mobile.ads.banner.BannerAdView
import com.yandex.mobile.ads.banner.ClosableBannerAdEventListener
import com.yandex.mobile.ads.common.AdRequest
import com.yandex.mobile.ads.common.AdRequestError
import com.yandex.mobile.ads.common.ImpressionData
import com.yandexmobileads.common.Constants
import com.yandexmobileads.common.EventEmitter
import com.yandexmobileads.common.NativeMapFactory
import com.yandexmobileads.util.mapper.AdRequestErrorMapper
import com.yandexmobileads.util.mapper.ImpressionDataMapper


@SuppressLint("ViewConstructor")
class YandexBannerView(
    context: ThemedReactContext,
) : FrameLayout(context) {
    private val nativeMapFactory: NativeMapFactory = NativeMapFactory()
    private val eventEmitter: EventEmitter = EventEmitter(context, nativeMapFactory)
    private val reactContext: ReactContext = context

    private val bannerEventListener = AdEventListener()
    private val reactLifecycleEventListener = ReactLifecycleEventListener()

    private var adView: BannerAdView? = null
    private var adUnitId: String? = null
    private var adRequest: AdRequest? = null
    private var bannerAdSize: BannerAdSize? = null

    init {
        context.addLifecycleEventListener(reactLifecycleEventListener)
    }

    override fun requestLayout() {
        super.requestLayout()
        post {
            measure(
                MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
            )
            layout(left, top, right, top + height)
        }
    }

    fun setAdUnitIdAndAdRequest(adUnitId: String, adRequest: AdRequest?) {
        this.adUnitId = adUnitId
        this.adRequest = adRequest
        createAdViewIfCan()
    }

    fun setSize(bannerSize: BannerAdSize) {
        bannerAdSize = bannerSize
        createAdViewIfCan()
    }

    private fun createAdViewIfCan() {
        if (adView != null) {
            return
        }
        val adUnitId = adUnitId ?: return
        val adRequest = adRequest ?: AdRequest.Builder().build()
        val bannerAdSize = bannerAdSize ?: return
        val bannerAdView = BannerAdView(reactContext).apply {
            setAdUnitId(adUnitId)
            setAdSize(bannerAdSize)
            setBannerAdEventListener(bannerEventListener)
        }
        adView = bannerAdView
        loadBannerAd(adRequest)
    }

    private fun loadBannerAd(adRequest: AdRequest) {
        adView?.loadAd(adRequest)
    }

    internal inner class AdEventListener(
        private val impressionDataMapper: ImpressionDataMapper = ImpressionDataMapper(),
        private val adRequestErrorMapper: AdRequestErrorMapper = AdRequestErrorMapper(),
    ) : ClosableBannerAdEventListener {
        override fun onImpression(impressionData: ImpressionData?) {
            val payload = if (impressionData != null) {
                val mappedImpression = impressionDataMapper.map(impressionData)
                mapOf(Constants.Key.IMPRESSION_DATA to mappedImpression)
            } else {
                null
            }
            eventEmitter.receiveEvent(id, Constants.EventName.ON_AD_IMPRESSION, payload)
        }

        override fun onAdClicked() {
            eventEmitter.receiveEvent(id, Constants.EventName.ON_AD_CLICKED)
        }

        override fun onAdLoaded() {
            removeAllViews()
            val size = bannerAdSize ?: return
            val view = adView ?: return
            val widthMeasureSpec = MeasureSpec.makeMeasureSpec(
                size.getWidthInPixels(context),
                MeasureSpec.AT_MOST
            )
            val heightMeasureSpec = MeasureSpec.makeMeasureSpec(
                size.getHeightInPixels(context),
                MeasureSpec.AT_MOST
            )
            view.measure(widthMeasureSpec, heightMeasureSpec)
            view.layout(left, top, left + width, top + height)
            addView(view)
            runCatching {
                viewTreeObserver.dispatchOnGlobalLayout()
            }
            eventEmitter.receiveEvent(id, Constants.EventName.ON_AD_LOADED)
        }

        override fun onAdFailedToLoad(error: AdRequestError) {
            eventEmitter.receiveEvent(
                id,
                Constants.EventName.ON_AD_FAILED_TO_LOAD,
                mapOf(Constants.Key.ERROR to adRequestErrorMapper.map(error))
            )
            adView = null
        }

        override fun onLeftApplication() {
            eventEmitter.receiveEvent(id, Constants.EventName.ON_LEFT_APPLICATION)
        }

        override fun onReturnedToApplication() {
            eventEmitter.receiveEvent(id, Constants.EventName.ON_RETURN_TO_APPLICATION)
        }

        override fun closeBannerAd() {
            eventEmitter.receiveEvent(id, Constants.EventName.ON_AD_CLOSE)
        }
    }

    @VisibleForTesting(otherwise = VisibleForTesting.PRIVATE)
    inner class ReactLifecycleEventListener : LifecycleEventListener {

        override fun onHostResume() = Unit

        override fun onHostPause() = Unit

        override fun onHostDestroy() {
            reactContext.removeLifecycleEventListener(this)
            adView?.destroy()
        }
    }
}

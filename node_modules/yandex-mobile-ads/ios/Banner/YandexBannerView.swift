#if !targetEnvironment(macCatalyst)

import Foundation
import React
import YandexMobileAds

class YandexBannerView: UIView {
    private let eventNameProvider: EventNameProvider
    private let typedBannerAdSizeFactory: TypedBannerAdSizeFactory
    private let adRequestFactory: AdRequestFactory
    private let errorMapper: ErrorMapper
    private let impressionDataMapper: ImpressionDataMapper
    
    private var adView: AdView?
    private var adUnitId: String?
    private var adRequest: AdRequest?
    private var adSize: BannerAdSize?
    
    @objc var onAdLoaded: RCTDirectEventBlock?
    @objc var onAdFailedToLoad: RCTDirectEventBlock?
    @objc var onAdImpression: RCTDirectEventBlock?
    @objc var onAdClicked: RCTDirectEventBlock?
    @objc var onLeftApplication: RCTDirectEventBlock?
    @objc var onAdClose: RCTDirectEventBlock?
    
    override init(frame: CGRect) {
        self.eventNameProvider = EventNameProvider()
        self.typedBannerAdSizeFactory = TypedBannerAdSizeFactory()
        self.adRequestFactory = AdRequestFactory()
        self.errorMapper = ErrorMapper()
        self.impressionDataMapper = ImpressionDataMapper()
        super.init(frame: frame)
        self.clipsToBounds = true
    }
    
    required init?(coder: NSCoder) {
        self.eventNameProvider = EventNameProvider()
        self.typedBannerAdSizeFactory = TypedBannerAdSizeFactory()
        self.adRequestFactory = AdRequestFactory()
        self.errorMapper = ErrorMapper()
        self.impressionDataMapper = ImpressionDataMapper()
        super.init(coder: coder)
        self.clipsToBounds = true
    }
    
    @objc
    func setAdRequest(_ adRequestDict: [String: Any]) {
        guard let adUnitId = adRequestDict[Constants.Key.adUnitId] as? String else {
            return
        }
        self.adUnitId = adUnitId
        if let adRequest = adRequestFactory.createFromDictionary(adRequestDict) {
            self.adRequest = adRequest
        }
        createAdViewIfCan()
    }
    
    @objc
    func setAdSize(_ adSizeDict: [String: Any]) {
        guard let bannerAdSize = typedBannerAdSizeFactory.createFromDictionary(adSizeDict) else {
            return
        }
        self.adSize = bannerAdSize.bannerAdSize
        createAdViewIfCan()
    }
    
    // MARK: - Private
    
    private func createAdViewIfCan() {
        guard adView == nil,
              let adUnitId,
              let adSize
        else {
            return
        }
        let adView = AdView(adUnitID: adUnitId, adSize: adSize)
        adView.delegate = self
        self.adView = adView
        self.adView?.loadAd(with: adRequest)
    }
    
    private func removeAllSubviews() {
        for subview in self.subviews {
            subview.removeFromSuperview()
        }
    }
}

// MARK: - AdViewDelegate

extension YandexBannerView: AdViewDelegate {
    func adViewDidLoad(_ adView: AdView) {
        removeAllSubviews()
        addSubview(adView)
        adView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            adView.centerXAnchor.constraint(equalTo: centerXAnchor),
            adView.centerYAnchor.constraint(equalTo: centerYAnchor),
        ])
        onAdLoaded?(nil)
    }
    
    func adViewDidFailLoading(_ adView: AdView, error: any Error) {
        let mappedError = errorMapper.mapError(error)
        onAdFailedToLoad?(mappedError)
        self.adView = nil
    }
    
    func adView(_ adView: AdView, didTrackImpression impressionData: (any ImpressionData)?) {
        var eventData = [String: Any]()
        if let impressionData {
            let mappedImpressionData = impressionDataMapper.map(impressionData)
            eventData[Constants.Key.impressionData] = mappedImpressionData
        }
        onAdImpression?(eventData)
    }
    
    func adViewDidClick(_ adView: AdView) {
        onAdClicked?(nil)
    }
    
    func adViewWillLeaveApplication(_ adView: AdView) {
        onLeftApplication?(nil)
    }
    
    func close(_ adView: AdView) {
        onAdClose?(nil)
    }
}

#endif

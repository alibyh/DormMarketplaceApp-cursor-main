#if !targetEnvironment(macCatalyst)

import Foundation
import YandexMobileAds
import React

@objc(YandexInterstitialAdModule)
class YandexInterstitialAdModule: NSObject {
    private let loaderStorage: ObjectStorage<InterstitialAdLoader>
    private let adsStorage: ObjectStorage<InterstitialAd>
    private let eventNameProvider: EventNameProvider
    private let adRequestConfigurationFactory: AdRequestConfigurationFactory
    
    private var loadPromises: [String: Queue<(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock)>]
    private var adLoaderDelegate: RNInterstitialAdLoaderDelegate?
    
    convenience override init() {
        let loaderStorage = ObjectStorage<InterstitialAdLoader>()
        let adsStorage = ObjectStorage<InterstitialAd>()
        let eventNameProvider = EventNameProvider()
        let adRequestConfigurationFactory = AdRequestConfigurationFactory()
        let loadPromises = [String : Queue<(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock)>]()
        self.init(
            loaderStorage: loaderStorage,
            adsStorage: adsStorage,
            eventNameProvider: eventNameProvider,
            adRequestConfigurationFactory: adRequestConfigurationFactory,
            loadPromises: loadPromises
        )
    }
    
    init(
        loaderStorage: ObjectStorage<InterstitialAdLoader>,
        adsStorage: ObjectStorage<InterstitialAd>,
        eventNameProvider: EventNameProvider,
        adRequestConfigurationFactory: AdRequestConfigurationFactory,
        loadPromises: [String : Queue<(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock)>],
        adLoaderDelegate: RNInterstitialAdLoaderDelegate? = nil
    ) {
        self.loaderStorage = loaderStorage
        self.adsStorage = adsStorage
        self.eventNameProvider = eventNameProvider
        self.adRequestConfigurationFactory = adRequestConfigurationFactory
        self.loadPromises = loadPromises
        self.adLoaderDelegate = adLoaderDelegate
    }
    
    @objc
    func methodQueue() -> DispatchQueue {
        DispatchQueue.main
    }
    
    @objc
    func newLoader(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: RCTPromiseRejectBlock
    ) {
        let loader = InterstitialAdLoader()
        let loaderId = self.loaderStorage.put(loader)
        self.adLoaderDelegate = RNInterstitialAdLoaderDelegate(loaderId: loaderId, adModule: self)
        loader.delegate = self.adLoaderDelegate
        resolve(loaderId)
    }
    
    @objc
    func loadAd(
        _ loaderId: String,
        adRequestConfiguration: [String: Any],
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let loader = self.loaderStorage.get(loaderId)
        guard let loader else {
            PromiseHelper.reject(with: reject, error: ObjectNotFoundError())
            return
        }
        if self.loadPromises[loaderId] == nil {
            self.loadPromises[loaderId] = Queue<(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock)>()
        }
        self.loadPromises[loaderId]?.enqueue((resolve, reject))
        guard let adRequestConfiguration = adRequestConfigurationFactory.createFromDictionary(adRequestConfiguration) else {
            PromiseHelper.reject(with: reject, error: InvalidAdRequestConfigurationError())
            return
        }
        loader.loadAd(with: adRequestConfiguration)
    }
    
    @objc
    func cancelLoading(_ loaderId: String) {
        loaderStorage.get(loaderId)?.cancelLoading()
        cleanUp(loaderId)
    }
    
    @objc
    func showAd(
        _ adObjectId: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let currentViewController = RCTPresentedViewController() else {
            self.deleteAd(id: adObjectId)
            PromiseHelper.reject(with: reject, error: ViewControllerIsNilError())
            return
        }
        self.adsStorage.get(adObjectId)?.show(from: currentViewController)
    }
    
    // MARK: - Private
    
    private func deleteAd(id: String) {
        let eventName = eventNameProvider.eventName(
            adType: .interstitial,
            for: Constants.EventName.onAdDeleted
        )
        let eventData = [Constants.Key.adId: id]
        EventEmitter.emit(eventName, data: eventData)
        adsStorage.remove(id)
    }
    
    private func cleanUp(_ loaderId: String) {
        loadPromises[loaderId]?.clear()
    }
    
    // MARK: - InterstitialAdLoaderDelegate
    
    class RNInterstitialAdLoaderDelegate: NSObject, InterstitialAdLoaderDelegate {
        private let loaderId: String
        private let errorMapper: ErrorMapper
        
        private weak var adModule: YandexInterstitialAdModule?
        private var adDelegate: RNInterstitialAdDelegate?
        
        convenience init(
            loaderId: String,
            adModule: YandexInterstitialAdModule,
            adDelegate: RNInterstitialAdDelegate? = nil
        ) {
            let errorMapper = ErrorMapper()
            self.init(
                loaderId: loaderId,
                errorMapper: errorMapper,
                adModule: adModule,
                adDelegate: adDelegate
            )
        }
        
        init(
            loaderId: String,
            errorMapper: ErrorMapper,
            adModule: YandexInterstitialAdModule,
            adDelegate: RNInterstitialAdDelegate?
        ) {
            self.adModule = adModule
            self.errorMapper = errorMapper
            self.loaderId = loaderId
            self.adDelegate = adDelegate
        }
        
        func interstitialAdLoader(_ adLoader: YandexMobileAds.InterstitialAdLoader, didLoad interstitialAd: YandexMobileAds.InterstitialAd) {
            guard let id = adModule?.adsStorage.put(interstitialAd) else {
                return
            }
            adDelegate = RNInterstitialAdDelegate(adId: id, adModule: adModule)
            interstitialAd.delegate = adDelegate
            let resolve = adModule?.loadPromises[loaderId]?.dequeue()?.resolve
            resolve?(id)
        }
        
        func interstitialAdLoader(_ adLoader: YandexMobileAds.InterstitialAdLoader, didFailToLoadWithError error: YandexMobileAds.AdRequestError) {
            let mappedError = errorMapper.mapAdRequestError(error)
            let reject = adModule?.loadPromises[loaderId]?.dequeue()?.reject
            let message = mappedError.toJSONString()
            reject?(Constants.Error.codeInternalError, message, nil)
        }
    }
    
    // MARK: - InterstitialAdDelegate
    
    class RNInterstitialAdDelegate: NSObject, InterstitialAdDelegate {
        private let adId: String
        private let eventNameProvider: EventNameProvider
        private let errorMapper: ErrorMapper
        private let impressionDataMapper: ImpressionDataMapper
        
        private weak var adModule: YandexInterstitialAdModule?
        
        convenience init(adId: String, adModule: YandexInterstitialAdModule?) {
            let eventNameProvider = EventNameProvider()
            let errorMapper = ErrorMapper()
            let impressionDataMapper = ImpressionDataMapper()
            self.init(
                adId: adId,
                eventNameProvider: eventNameProvider,
                errorMapper: errorMapper,
                impressionDataMapper: impressionDataMapper,
                adModule: adModule
            )
        }
        
        init(
            adId: String,
            eventNameProvider: EventNameProvider,
            errorMapper: ErrorMapper,
            impressionDataMapper: ImpressionDataMapper,
            adModule: YandexInterstitialAdModule?
        ) {
            self.adId = adId
            self.eventNameProvider = eventNameProvider
            self.errorMapper = errorMapper
            self.impressionDataMapper = impressionDataMapper
            self.adModule = adModule
        }
        
        func interstitialAdDidShow(_ interstitialAd: InterstitialAd) {
            let eventName = eventNameProvider.eventName(
                adType: .interstitial,
                for: Constants.EventName.onAdShown
            )
            let eventData = [Constants.Key.adId: adId]
            EventEmitter.emit(eventName, data: eventData)
        }
        
        func interstitialAd(_ interstitialAd: InterstitialAd, didFailToShowWithError error: any Error) {
            let eventName = eventNameProvider.eventName(
                adType: .interstitial,
                for: Constants.EventName.onAdFailedToShow
            )
            let mappedError = errorMapper.mapError(error)
            let eventData: [String: Any] = [Constants.Key.adId: adId, Constants.Key.error: mappedError]
            EventEmitter.emit(eventName, data: eventData)
        }
        
        func interstitialAdDidDismiss(_ interstitialAd: InterstitialAd) {
            let eventName = eventNameProvider.eventName(
                adType: .interstitial,
                for: Constants.EventName.onAdDismissed
            )
            let eventData = [Constants.Key.adId: adId]
            EventEmitter.emit(eventName, data: eventData)
            adModule?.deleteAd(id: adId)
        }
        
        func interstitialAd(_ interstitialAd: InterstitialAd, didTrackImpressionWith impressionData: (any ImpressionData)?) {
            let eventName = eventNameProvider.eventName(
                adType: .interstitial,
                for: Constants.EventName.onAdImpression
            )
            var eventData: [String: Any] = [Constants.Key.adId: adId]
            if let impressionData {
                let mappedImpressionData = impressionDataMapper.map(impressionData)
                eventData[Constants.Key.impressionData] = mappedImpressionData
            }
            EventEmitter.emit(eventName, data: eventData)
        }
        
        func interstitialAdDidClick(_ interstitialAd: InterstitialAd) {
            let eventName = eventNameProvider.eventName(
                adType: .interstitial,
                for: Constants.EventName.onAdClicked
            )
            let eventData = [Constants.Key.adId: adId]
            EventEmitter.emit(eventName, data: eventData)
        }
    }
}

#endif

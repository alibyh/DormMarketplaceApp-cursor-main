#if !targetEnvironment(macCatalyst)

import Foundation
import YandexMobileAds
import React

@objc(YandexAppOpenAdModule)
class YandexAppOpenAdModule: NSObject {
    private let loaderStorage: ObjectStorage<AppOpenAdLoader>
    private let adsStorage: ObjectStorage<AppOpenAd>
    private let eventNameProvider: EventNameProvider
    private let adRequestConfigurationFactory: AdRequestConfigurationFactory
    
    private var loadPromises: [String: Queue<(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock)>]
    private var adLoaderDelegate: RNAppOpenAdLoaderDelegate?
    
    convenience override init() {
        let loaderStorage = ObjectStorage<AppOpenAdLoader>()
        let adsStorage = ObjectStorage<AppOpenAd>()
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
        loaderStorage: ObjectStorage<AppOpenAdLoader>,
        adsStorage: ObjectStorage<AppOpenAd>,
        eventNameProvider: EventNameProvider,
        adRequestConfigurationFactory: AdRequestConfigurationFactory,
        loadPromises: [String : Queue<(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock)>],
        adLoaderDelegate: RNAppOpenAdLoaderDelegate? = nil
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
        let loader = AppOpenAdLoader()
        let loaderId = self.loaderStorage.put(loader)
        self.adLoaderDelegate = RNAppOpenAdLoaderDelegate(loaderId: loaderId, adModule: self)
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
            adType: .appOpen,
            for: Constants.EventName.onAdDeleted
        )
        let eventData = [Constants.Key.adId: id]
        EventEmitter.emit(eventName, data: eventData)
        adsStorage.remove(id)
    }
    
    private func cleanUp(_ loaderId: String) {
        loadPromises[loaderId]?.clear()
    }
    
    // MARK: - AppOpenAdLoaderDelegate
    
    class RNAppOpenAdLoaderDelegate: NSObject, AppOpenAdLoaderDelegate {
        private let loaderId: String
        private let errorMapper: ErrorMapper
        
        private weak var adModule: YandexAppOpenAdModule?
        private var adDelegate: RNAppOpenAdDelegate?
        
        convenience init(
            loaderId: String,
            adModule: YandexAppOpenAdModule,
            adDelegate: RNAppOpenAdDelegate? = nil
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
            adModule: YandexAppOpenAdModule,
            adDelegate: RNAppOpenAdDelegate?
        ) {
            self.loaderId = loaderId
            self.errorMapper = errorMapper
            self.adModule = adModule
            self.adDelegate = adDelegate
        }
        
        func appOpenAdLoader(_ adLoader: YandexMobileAds.AppOpenAdLoader, didLoad appOpenAd: YandexMobileAds.AppOpenAd) {
            guard let id = adModule?.adsStorage.put(appOpenAd) else {
                return
            }
            adDelegate = RNAppOpenAdDelegate(adId: id, adModule: adModule)
            appOpenAd.delegate = adDelegate
            let resolve = adModule?.loadPromises[loaderId]?.dequeue()?.resolve
            resolve?(id)
        }
        
        func appOpenAdLoader(_ adLoader: YandexMobileAds.AppOpenAdLoader, didFailToLoadWithError error: YandexMobileAds.AdRequestError) {
            let mappedError = errorMapper.mapAdRequestError(error)
            let reject = adModule?.loadPromises[loaderId]?.dequeue()?.reject
            let message = mappedError.toJSONString()
            reject?(Constants.Error.codeInternalError, message, nil)
        }
    }
    
    // MARK: - AppOpenAdDelegate
    
    class RNAppOpenAdDelegate: NSObject, AppOpenAdDelegate {
        private let adId: String
        private let eventNameProvider: EventNameProvider
        private let errorMapper: ErrorMapper
        private let impressionDataMapper: ImpressionDataMapper
        
        private weak var adModule: YandexAppOpenAdModule?
        
        convenience init(adId: String, adModule: YandexAppOpenAdModule?) {
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
            adModule: YandexAppOpenAdModule?
        ) {
            self.adId = adId
            self.eventNameProvider = eventNameProvider
            self.errorMapper = errorMapper
            self.impressionDataMapper = impressionDataMapper
            self.adModule = adModule
        }
        
        func appOpenAdDidShow(_ appOpenAd: AppOpenAd) {
            let eventName = eventNameProvider.eventName(
                adType: .appOpen,
                for: Constants.EventName.onAdShown
            )
            let eventData = [Constants.Key.adId: adId]
            EventEmitter.emit(eventName, data: eventData)
        }
        
        func appOpenAd(_ appOpenAd: AppOpenAd, didFailToShowWithError error: any Error) {
            let eventName = eventNameProvider.eventName(
                adType: .appOpen,
                for: Constants.EventName.onAdFailedToShow
            )
            let mappedError = errorMapper.mapError(error)
            let eventData: [String: Any] = [Constants.Key.adId: adId, Constants.Key.error: mappedError]
            EventEmitter.emit(eventName, data: eventData)
        }
        
        func appOpenAdDidDismiss(_ appOpenAd: AppOpenAd) {
            let eventName = eventNameProvider.eventName(
                adType: .appOpen,
                for: Constants.EventName.onAdDismissed
            )
            let eventData = [Constants.Key.adId: adId]
            EventEmitter.emit(eventName, data: eventData)
            adModule?.deleteAd(id: adId)
        }
        
        func appOpenAd(_ appOpenAd: AppOpenAd, didTrackImpressionWith impressionData: (any ImpressionData)?) {
            let eventName = eventNameProvider.eventName(
                adType: .appOpen,
                for: Constants.EventName.onAdImpression
            )
            var eventData: [String: Any] = [Constants.Key.adId: adId]
            if let impressionData {
                let mappedImpressionData = impressionDataMapper.map(impressionData)
                eventData[Constants.Key.impressionData] = mappedImpressionData
            }
            EventEmitter.emit(eventName, data: eventData)
        }
        
        func appOpenAdDidClick(_ appOpenAd: AppOpenAd) {
            let eventName = eventNameProvider.eventName(
                adType: .appOpen,
                for: Constants.EventName.onAdClicked
            )
            let eventData = [Constants.Key.adId: adId]
            EventEmitter.emit(eventName, data: eventData)
        }
    }
}

#endif

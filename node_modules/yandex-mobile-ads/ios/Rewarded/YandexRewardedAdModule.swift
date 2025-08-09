#if !targetEnvironment(macCatalyst)

import Foundation
import YandexMobileAds
import React

@objc(YandexRewardedAdModule)
class YandexRewardedAdModule: NSObject {
    private let loaderStorage: ObjectStorage<RewardedAdLoader>
    private let adsStorage: ObjectStorage<RewardedAd>
    private let eventNameProvider: EventNameProvider
    private let adRequestConfigurationFactory: AdRequestConfigurationFactory
    
    private var loadPromises: [String: Queue<(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock)>]
    private var adLoaderDelegate: RNRewardedAdLoaderDelegate?
    
    convenience override init() {
        let loaderStorage = ObjectStorage<RewardedAdLoader>()
        let adsStorage = ObjectStorage<RewardedAd>()
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
        loaderStorage: ObjectStorage<RewardedAdLoader>,
        adsStorage: ObjectStorage<RewardedAd>,
        eventNameProvider: EventNameProvider,
        adRequestConfigurationFactory: AdRequestConfigurationFactory,
        loadPromises: [String : Queue<(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock)>],
        adLoaderDelegate: RNRewardedAdLoaderDelegate? = nil
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
        let loader = RewardedAdLoader()
        let loaderId = self.loaderStorage.put(loader)
        self.adLoaderDelegate = RNRewardedAdLoaderDelegate(loaderId: loaderId, adModule: self)
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
            adType: .rewarded,
            for: Constants.EventName.onAdDeleted
        )
        let eventData = [Constants.Key.adId: id]
        EventEmitter.emit(eventName, data: eventData)
        adsStorage.remove(id)
    }
    
    private func cleanUp(_ loaderId: String) {
        loadPromises[loaderId]?.clear()
    }
    
    // MARK: - RewardedAdLoaderDelegate
    
    class RNRewardedAdLoaderDelegate: NSObject, RewardedAdLoaderDelegate {
        private let loaderId: String
        private let errorMapper: ErrorMapper
        
        private weak var adModule: YandexRewardedAdModule?
        private var adDelegate: RNRewardedAdDelegate?
        
        convenience init(
            loaderId: String,
            adModule: YandexRewardedAdModule,
            adDelegate: RNRewardedAdDelegate? = nil
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
            adModule: YandexRewardedAdModule,
            adDelegate: RNRewardedAdDelegate?
        ) {
            self.loaderId = loaderId
            self.errorMapper = errorMapper
            self.adModule = adModule
            self.adDelegate = adDelegate
        }
        
        func rewardedAdLoader(_ adLoader: YandexMobileAds.RewardedAdLoader, didLoad rewardedAd: YandexMobileAds.RewardedAd) {
            guard let id = adModule?.adsStorage.put(rewardedAd) else {
                return
            }
            adDelegate = RNRewardedAdDelegate(adId: id, adModule: adModule)
            rewardedAd.delegate = adDelegate
            let resolve = adModule?.loadPromises[loaderId]?.dequeue()?.resolve
            resolve?(id)
        }
        
        func rewardedAdLoader(_ adLoader: YandexMobileAds.RewardedAdLoader, didFailToLoadWithError error: YandexMobileAds.AdRequestError) {
            let mappedError = errorMapper.mapAdRequestError(error)
            let reject = adModule?.loadPromises[loaderId]?.dequeue()?.reject
            let message = mappedError.toJSONString()
            reject?(Constants.Error.codeInternalError, message, nil)
        }
    }
    
    // MARK: - RewardedAdDelegate
    
    class RNRewardedAdDelegate: NSObject, RewardedAdDelegate {
        private let adId: String
        private let eventNameProvider: EventNameProvider
        private let errorMapper: ErrorMapper
        private let impressionDataMapper: ImpressionDataMapper
        private let rewardMapper: RewardMapper
        
        private weak var adModule: YandexRewardedAdModule?
        
        convenience init(adId: String, adModule: YandexRewardedAdModule?) {
            let eventNameProvider = EventNameProvider()
            let errorMapper = ErrorMapper()
            let impressionDataMapper = ImpressionDataMapper()
            let rewardMapper = RewardMapper()
            self.init(
                adId: adId,
                eventNameProvider: eventNameProvider,
                errorMapper: errorMapper,
                impressionDataMapper: impressionDataMapper,
                rewardMapper: rewardMapper,
                adModule: adModule
            )
        }
        
        init(
            adId: String,
            eventNameProvider: EventNameProvider,
            errorMapper: ErrorMapper,
            impressionDataMapper: ImpressionDataMapper,
            rewardMapper: RewardMapper,
            adModule: YandexRewardedAdModule?
        ) {
            self.adId = adId
            self.eventNameProvider = eventNameProvider
            self.errorMapper = errorMapper
            self.impressionDataMapper = impressionDataMapper
            self.rewardMapper = rewardMapper
            self.adModule = adModule
        }
        
        func rewardedAdDidShow(_ rewardedAd: RewardedAd) {
            let eventName = eventNameProvider.eventName(
                adType: .rewarded,
                for: Constants.EventName.onAdShown
            )
            let eventData = [Constants.Key.adId: adId]
            EventEmitter.emit(eventName, data: eventData)
        }
        
        func rewardedAd(_ rewardedAd: RewardedAd, didFailToShowWithError error: any Error) {
            let eventName = eventNameProvider.eventName(
                adType: .rewarded,
                for: Constants.EventName.onAdFailedToShow
            )
            let mappedError = errorMapper.mapError(error)
            let eventData: [String: Any] = [Constants.Key.adId: adId, Constants.Key.error: mappedError]
            EventEmitter.emit(eventName, data: eventData)
        }
        
        func rewardedAdDidDismiss(_ rewardedAd: RewardedAd) {
            let eventName = eventNameProvider.eventName(
                adType: .rewarded,
                for: Constants.EventName.onAdDismissed
            )
            let eventData = [Constants.Key.adId: adId]
            EventEmitter.emit(eventName, data: eventData)
            adModule?.deleteAd(id: adId)
        }
        
        func rewardedAd(_ rewardedAd: RewardedAd, didTrackImpressionWith impressionData: (any ImpressionData)?) {
            let eventName = eventNameProvider.eventName(
                adType: .rewarded,
                for: Constants.EventName.onAdImpression
            )
            var eventData: [String: Any] = [Constants.Key.adId: adId]
            if let impressionData {
                let mappedImpressionData = impressionDataMapper.map(impressionData)
                eventData[Constants.Key.impressionData] = mappedImpressionData
            }
            EventEmitter.emit(eventName, data: eventData)
        }
        
        func rewardedAdDidClick(_ rewardedAd: RewardedAd) {
            let eventName = eventNameProvider.eventName(
                adType: .rewarded,
                for: Constants.EventName.onAdClicked
            )
            let eventData = [Constants.Key.adId: adId]
            EventEmitter.emit(eventName, data: eventData)
        }
        
        func rewardedAd(_ rewardedAd: YandexMobileAds.RewardedAd, didReward reward: any YandexMobileAds.Reward) {
            let eventName = eventNameProvider.eventName(
                adType: .rewarded,
                for: Constants.EventName.onAdDidReward
            )
            let mappedReward = rewardMapper.map(reward)
            let eventData: [String: Any] = [Constants.Key.adId: adId, Constants.Key.reward: mappedReward]
            EventEmitter.emit(eventName, data: eventData)
        }
    }
}

#endif

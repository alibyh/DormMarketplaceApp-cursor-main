#if !targetEnvironment(macCatalyst)

import Foundation
import React

@objc(YandexBannerViewManager)
class YandexBannerViewManager: RCTViewManager {
    private let bannerAdSizeFactory: TypedBannerAdSizeFactory
    
    convenience override init() {
        let bannerAdSizeFactory = TypedBannerAdSizeFactory()
        self.init(bannerAdSizeFactory: bannerAdSizeFactory)
    }
    
    init(bannerAdSizeFactory: TypedBannerAdSizeFactory) {
        self.bannerAdSizeFactory = bannerAdSizeFactory
    }
    
    override func view() -> UIView {
        YandexBannerView()
    }
    
    override static func requiresMainQueueSetup() -> Bool {
        true
    }
}

#endif

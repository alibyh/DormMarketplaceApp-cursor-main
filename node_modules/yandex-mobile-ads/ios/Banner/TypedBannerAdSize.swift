#if !targetEnvironment(macCatalyst)

import Foundation
import YandexMobileAds

class TypedBannerAdSize {
    private(set) var bannerAdSize: BannerAdSize
    private(set) var initialWidth: Double
    private(set) var initialHeight: Double
    private(set) var type: String
    
    init(bannerAdSize: BannerAdSize, initialWidth: Double, initialHeight: Double, type: String) {
        self.bannerAdSize = bannerAdSize
        self.initialWidth = initialWidth
        self.initialHeight = initialHeight
        self.type = type
    }
}

#endif

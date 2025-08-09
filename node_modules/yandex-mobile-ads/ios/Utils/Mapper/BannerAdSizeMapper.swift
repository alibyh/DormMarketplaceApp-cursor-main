import Foundation
import YandexMobileAds

class BannerAdSizeMapper {
    func map(bannerAdSize: BannerAdSize, initialWidth: Any, initialHeight: Any) -> [String: Any] {
        let result = [
            Constants.Key.height: bannerAdSize.size.height,
            Constants.Key.width: bannerAdSize.size.width,
            Constants.Key.initialWidth: initialWidth,
            Constants.Key.initialHeight: initialHeight,
            Constants.Key.heightInPixels: bannerAdSize.size.height,
            Constants.Key.widthInPixels: bannerAdSize.size.width,
        ]
        return result
    }
}

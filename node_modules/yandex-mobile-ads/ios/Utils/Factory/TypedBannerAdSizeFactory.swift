import Foundation
import YandexMobileAds

class TypedBannerAdSizeFactory {
    func createSticky(width: CGFloat) -> TypedBannerAdSize {
        let bannerAdSize = BannerAdSize.stickySize(withContainerWidth: width)
        return TypedBannerAdSize(
            bannerAdSize: bannerAdSize,
            initialWidth: width,
            initialHeight: bannerAdSize.size.height,
            type: Constants.BannerType.sticky
        )
    }
    
    func createInline(width: CGFloat, maxHeight: CGFloat) -> TypedBannerAdSize {
        let bannerAdSize = BannerAdSize.inlineSize(withWidth: width, maxHeight: maxHeight)
        return TypedBannerAdSize(
            bannerAdSize: bannerAdSize,
            initialWidth: width,
            initialHeight: maxHeight,
            type: Constants.BannerType.inline
        )
    }
    
    func createFromDictionary(_ dictionary: [String: Any]) -> TypedBannerAdSize? {
        guard let type = dictionary[Constants.Key.bannerType] as? String else {
            return nil
        }
        switch type {
        case Constants.BannerType.sticky:
            guard let width = dictionary[Constants.Key.initialWidth] as? CGFloat else {
                return nil
            }
            return createSticky(width: width)
        case Constants.BannerType.inline:
            guard let width = dictionary[Constants.Key.initialWidth] as? CGFloat,
                  let height = dictionary[Constants.Key.initialHeight] as? CGFloat
            else {
                return nil
            }
            return createInline(width: width, maxHeight: height)
        default:
            return nil
        }
    }
}

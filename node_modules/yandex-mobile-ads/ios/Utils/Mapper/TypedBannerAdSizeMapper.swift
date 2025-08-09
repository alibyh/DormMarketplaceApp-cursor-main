import Foundation

class TypedBannerAdSizeMapper {
    private let bannerAdSizeMapper: BannerAdSizeMapper
    
    convenience init() {
        let bannerAdSizeMapper = BannerAdSizeMapper()
        self.init(bannerAdSizeMapper: bannerAdSizeMapper)
    }
    
    init(bannerAdSizeMapper: BannerAdSizeMapper) {
        self.bannerAdSizeMapper = bannerAdSizeMapper
    }
    
    func map(bannedAdSize: TypedBannerAdSize) -> [String: Any] {
        var result = bannerAdSizeMapper.map(
            bannerAdSize: bannedAdSize.bannerAdSize,
            initialWidth: bannedAdSize.initialWidth,
            initialHeight: bannedAdSize.initialHeight
        )
        result[Constants.Key.bannerType] = bannedAdSize.type
        return result
    }
}

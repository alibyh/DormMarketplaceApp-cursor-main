#if !targetEnvironment(macCatalyst)

import Foundation

@objc(YandexBannerAdSizeModule)
class YandexBannerAdSizeModule: NSObject {
    private let adSizeFactory: TypedBannerAdSizeFactory
    private let adSizeMapper: TypedBannerAdSizeMapper
    
    convenience override init() {
        let adSizeFactory = TypedBannerAdSizeFactory()
        let adSizeMapper = TypedBannerAdSizeMapper()
        self.init(adSizeFactory: adSizeFactory, adSizeMapper: adSizeMapper)
    }
    
    init(adSizeFactory: TypedBannerAdSizeFactory, adSizeMapper: TypedBannerAdSizeMapper) {
        self.adSizeFactory = adSizeFactory
        self.adSizeMapper = adSizeMapper
    }
    
    @objc
    func methodQueue() -> DispatchQueue {
        DispatchQueue.main
    }
    
    @objc
    func createStickyBannerSize(
        _ width: NSNumber,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let adSize = adSizeFactory.createSticky(width: CGFloat(truncating: width))
        let mappedAdSize = adSizeMapper.map(bannedAdSize: adSize)
        resolve(mappedAdSize)
    }
    
    @objc
    func createInlineBannerSize(
        _ width: NSNumber,
        maxHeight: NSNumber,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let adSize = adSizeFactory.createInline(width: CGFloat(truncating: width), maxHeight: CGFloat(truncating: maxHeight))
        let mappedAdSize = adSizeMapper.map(bannedAdSize: adSize)
        resolve(mappedAdSize)
    }
}

#endif

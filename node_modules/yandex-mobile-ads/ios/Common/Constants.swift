#if !targetEnvironment(macCatalyst)

import Foundation

struct Constants {
    enum AdType: String, CaseIterable {
        case interstitial = "Interstitial"
        case rewarded = "Rewarded"
        case appOpen = "AppOpen"
    }
    
    struct EventName {
        static let onAdLoaded = "onAdLoaded"
        static let onAdFailedToLoad = "onAdFailedToLoad"
        
        static let onAdShown = "onAdShown"
        static let onAdFailedToShow = "onAdFailedToShow"
        static let onAdImpression = "onAdImpression"
        static let onAdClicked = "onAdClicked"
        static let onAdDismissed = "onAdDismissed"
        static let onAdDidReward = "onAdDidReward"
        
        static let onLeftApplication = "onLeftApplication"
        static let onReturnToApplication = "onReturnToApplication"
        
        static let onAdDeleted = "onAdDeleted"
        
        static var allNames: [String] {
            return [
                onAdLoaded,
                onAdFailedToLoad,
                onAdShown,
                onAdFailedToShow,
                onAdImpression,
                onAdClicked,
                onAdDismissed,
                onAdDidReward,
                onLeftApplication,
                onReturnToApplication,
                onAdDeleted
            ]
        }
    }
    
    struct BannerType {
        static let sticky = "sticky"
        static let inline = "inline"
    }
    
    struct Key {
        static let adId = "adId"
        static let loaderId = "loaderId"
        static let error = "error"
        static let description = "description"
        static let impressionData = "impressionData"
        static let reward = "reward"
        
        static let bannerType = "type"
        static let height = "height"
        static let width = "width"
        static let initialWidth = "initialWidth"
        static let initialHeight = "initialHeight"
        static let heightInPixels = "heightInPixels"
        static let widthInPixels = "widthInPixels"
        
        static let adUnitId = "_adUnitId"
        static let age = "_age"
        static let contextQuery = "_contextQuery"
        static let contextTags = "_contextTags"
        static let gender = "_gender"
        static let location = "_location"
        static let adTheme = "_adTheme"
        static let biddingData = "_biddingData"
        static let parameters = "_parameters"
        
        static let latitude = "_latitude"
        static let longitude = "_longitude"
    }
    
    struct Gender {
        static let male = "Male"
        static let female = "Female"
    }
    
    struct AdTheme {
        static let light = "Light"
        static let dark = "Dark"
    }
    
    struct Error {
        static let codeInternalError = "Internal error"
        static let codeCurrentVCIsNil = "View Controller for displaying ad is nil"
        static let codeInvalidAdRequestConfiguration = "Invalid AdRequestConfiguration"
        
        static let messageObjectNotFound = "Object with provided id was not found"
        static let messageCurrentVCIsNil = "Unable to show ad because current View Controller is nil"
        static let messageInvalidAdRequestConfiguration = "Unable to create native AdRequestConfiguration"
    }
}

#endif

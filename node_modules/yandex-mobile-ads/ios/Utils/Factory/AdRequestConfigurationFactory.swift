import Foundation
import YandexMobileAds

class AdRequestConfigurationFactory {
    private let locationFactory: LocationFactory
    
    convenience init() {
        let locationFactory = LocationFactory()
        self.init(locationFactory: locationFactory)
    }
    
    init(locationFactory: LocationFactory) {
        self.locationFactory = locationFactory
    }
    
    func createFromDictionary(_ dict: [String: Any]) -> AdRequestConfiguration? {
        guard let adUnitId = dict[Constants.Key.adUnitId] as? String else {
            return nil
        }
        
        let adRequestConfiguration = AdRequestConfiguration(adUnitID: adUnitId)
        let mutableConfiguration = adRequestConfiguration.mutableConfiguration
        
        mutableConfiguration.location = locationFactory.createFromDictionary(dict[Constants.Key.location] as? [String: Any])
        mutableConfiguration.contextQuery = dict[Constants.Key.contextQuery] as? String
        mutableConfiguration.contextTags = dict[Constants.Key.contextTags] as? [String]
        mutableConfiguration.biddingData = dict[Constants.Key.biddingData] as? String
        mutableConfiguration.parameters = dict[Constants.Key.parameters] as? [String: String]
        
        if let ageString = dict[Constants.Key.age] as? String,
           let ageInt = Int(ageString) {
            mutableConfiguration.age = NSNumber(value: ageInt)
        }
        
        if let gender = dict[Constants.Key.gender] as? String {
            switch gender {
            case Constants.Gender.male:
                mutableConfiguration.gender = kYMAGenderMale
            case Constants.Gender.female:
                mutableConfiguration.gender = kYMAGenderFemale
            default:
                mutableConfiguration.gender = nil
            }
        }
        
        mutableConfiguration.adTheme = .unspecified
        if let adTheme = dict[Constants.Key.adTheme] as? String {
            switch adTheme {
            case Constants.AdTheme.light:
                mutableConfiguration.adTheme = .light
            case Constants.AdTheme.dark:
                mutableConfiguration.adTheme = .dark
            default:
                break
            }
        }
        
        return mutableConfiguration
    }
}

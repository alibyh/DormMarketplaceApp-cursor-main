import Foundation
import YandexMobileAds

class AdRequestFactory {
    private let locationFactory: LocationFactory
    
    convenience init() {
        let locationFactory = LocationFactory()
        self.init(locationFactory: locationFactory)
    }
    
    init(locationFactory: LocationFactory) {
        self.locationFactory = locationFactory
    }
    
    func createFromDictionary(_ dict: [String: Any]) -> AdRequest? {
        let adRequest = AdRequest()
        let mutableRequest = adRequest.mutableRequest
        
        mutableRequest.location = locationFactory.createFromDictionary(dict[Constants.Key.location] as? [String: Any])
        mutableRequest.contextQuery = dict[Constants.Key.contextQuery] as? String
        mutableRequest.contextTags = dict[Constants.Key.contextTags] as? [String]
        if let biddingData = dict[Constants.Key.biddingData] as? String, !biddingData.isEmpty {
            mutableRequest.biddingData = biddingData
        }
        mutableRequest.parameters = dict[Constants.Key.parameters] as? [String: String]
        
        if let ageString = dict[Constants.Key.age] as? String,
           let ageInt = Int(ageString) {
            mutableRequest.age = NSNumber(value: ageInt)
        }
        
        if let gender = dict[Constants.Key.gender] as? String {
            switch gender {
            case Constants.Gender.male:
                mutableRequest.gender = kYMAGenderMale
            case Constants.Gender.female:
                mutableRequest.gender = kYMAGenderFemale
            default:
                mutableRequest.gender = nil
            }
        }
        
        mutableRequest.adTheme = .unspecified
        if let adTheme = dict[Constants.Key.adTheme] as? String {
            switch adTheme {
            case Constants.AdTheme.light:
                mutableRequest.adTheme = .light
            case Constants.AdTheme.dark:
                mutableRequest.adTheme = .dark
            default:
                break
            }
        }
        
        return mutableRequest
    }
}

import Foundation

private let commonPrefix = "RNYandexMobileAds"

class EventNameProvider {
    func eventName(adType: Constants.AdType, for event: String) -> String {
        let eventName = commonPrefix + "-" + adType.rawValue + "-" + event
        return eventName
    }
    
    func supportedEventsNames() -> [String] {
        let allNames = Constants.EventName.allNames.reduce(into: [String]()) { partialResult, event in
            Constants.AdType.allCases.forEach { adType in
                let eventName = eventName(adType: adType, for: event)
                partialResult.append(eventName)
            }
        }
        return allNames
    }
}

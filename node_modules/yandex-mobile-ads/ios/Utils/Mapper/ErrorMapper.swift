import Foundation
import YandexMobileAds

private let adUnitIdKey = "adUnitId"

class ErrorMapper {
    func mapAdRequestError(_ error: AdRequestError) -> [String: Any] {
        var result = [Constants.Key.description: error.error.localizedDescription]
        if let adUnitId = error.adUnitId {
            result[adUnitIdKey] = adUnitId
        }
        return result
    }
    
    func mapError(_ error: Error) -> [String: Any] {
        let result = [Constants.Key.description: error.localizedDescription]
        return result
    }
}

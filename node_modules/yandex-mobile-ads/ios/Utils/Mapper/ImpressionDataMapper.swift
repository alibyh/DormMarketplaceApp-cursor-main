import Foundation
import YandexMobileAds

private let rawDataKey = "rawData"

class ImpressionDataMapper {
    func map(_ impressionData: ImpressionData) -> [String: Any] {
        let result: [String: Any] = [
            rawDataKey: impressionData.rawData
        ]
        return result
    }
}

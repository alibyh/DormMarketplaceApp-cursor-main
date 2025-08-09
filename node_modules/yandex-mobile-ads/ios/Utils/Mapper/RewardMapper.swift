import Foundation
import YandexMobileAds

private let typeKey = "type"
private let amountKey = "amount"

class RewardMapper {
    func map(_ reward: Reward) -> [String: Any] {
        let result: [String: Any] = [
            typeKey: reward.type,
            amountKey: reward.amount
        ]
        return result
    }
}

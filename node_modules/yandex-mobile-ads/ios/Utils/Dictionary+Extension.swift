import Foundation

private let emptyString = ""

extension Dictionary {
    func toJSONString() -> String? {
        if JSONSerialization.isValidJSONObject(self),
           let jsonData = try? JSONSerialization.data(withJSONObject: self, options: []),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            return jsonString
        }
        return emptyString
    }
}

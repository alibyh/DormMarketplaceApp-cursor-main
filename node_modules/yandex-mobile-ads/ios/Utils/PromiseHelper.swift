import Foundation

class PromiseHelper {
    static func reject(with rejecter: @escaping RCTPromiseRejectBlock, error: PluginError) {
        rejecter(error.code, error.message, error.error)
    }
}

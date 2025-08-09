#if !targetEnvironment(macCatalyst)

import Foundation

class PluginError {
    private(set) var code: String
    private(set) var message: String
    private(set) var error: Error?
    
    init(code: String, message: String, error: Error?) {
        self.code = code
        self.message = message
        self.error = error
    }
}

final class ViewControllerIsNilError: PluginError {
    init() {
        let code = Constants.Error.codeCurrentVCIsNil
        let message = Constants.Error.messageCurrentVCIsNil
        super.init(code: code, message: message, error: nil)
    }
}

final class ObjectNotFoundError: PluginError {
    init() {
        let code = Constants.Error.codeInternalError
        let message = Constants.Error.messageObjectNotFound
        super.init(code: code, message: message, error: nil)
    }
}

final class InvalidAdRequestConfigurationError: PluginError {
    init() {
        let code = Constants.Error.codeInvalidAdRequestConfiguration
        let message = Constants.Error.messageInvalidAdRequestConfiguration
        super.init(code: code, message: message, error: nil)
    }
}

#endif

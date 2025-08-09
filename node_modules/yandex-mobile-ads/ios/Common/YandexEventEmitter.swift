#if !targetEnvironment(macCatalyst)

import Foundation
import React

@objc(EventEmitter)
class EventEmitter: RCTEventEmitter {
    private static var supportedEventsNames = [String]()
    private static var hasListeners = false
    private static var emitter: RCTEventEmitter!
    
    override init() {
        super.init()
        EventEmitter.supportedEventsNames = EventNameProvider().supportedEventsNames()
        EventEmitter.emitter = self
    }
    
    override func startObserving() {
        EventEmitter.hasListeners = true
    }
    
    override func stopObserving() {
        EventEmitter.hasListeners = false
    }
    
    override func supportedEvents() -> [String] {
        return EventEmitter.supportedEventsNames
    }
    
    static func emit(_ event: String, data: [String: Any]? = nil) {
        let body = data ?? [:]
        if EventEmitter.hasListeners {
            emitter.sendEvent(withName: event, body: body)
        }
    }
}

#endif

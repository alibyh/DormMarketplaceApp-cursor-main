#if !targetEnvironment(macCatalyst)

import Foundation

class ObjectStorage<T> {
    private var idCounter: Int64 = 0
    private var storage = [String: T]()
    private let lock = NSLock()
    
    func put(_ obj: T) -> String {
        lock.synchronized {
            idCounter += 1
            let id = String(idCounter)
            storage[id] = obj
            return id
        }
    }
    
    func get(_ key: String) -> T? {
        lock.synchronized {
            return storage[key]
        }
    }
    
    func remove(_ key: String) {
        lock.synchronized {
            storage.removeValue(forKey: key)
        }
    }
}

extension NSLock {
    @discardableResult
    func synchronized<T>(_ closure: () -> T) -> T {
        lock()
        defer { unlock() }
        return closure()
    }
}

#endif

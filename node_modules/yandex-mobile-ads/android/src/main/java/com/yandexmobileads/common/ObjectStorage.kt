package com.yandexmobileads.common

class ObjectStorage<T> {
    private var idCounter: Long = 0L
    private val storage = HashMap<String, T>()

    fun put(obj: T): String {
        synchronized(LOCK) {
            val id = idCounter++.toString()
            storage[id] = obj
            return id
        }
    }

    fun get(key: String): T? {
        synchronized(LOCK) {
            return storage[key]
        }
    }

    fun remove(key: String) {
        synchronized(LOCK) {
            storage.remove(key)
        }
    }

    companion object {
        private val LOCK = Any()
    }
}

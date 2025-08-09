import Foundation

class Node<T> {
    var value: T
    var next: Node?
    
    init(value: T, next: Node? = nil) {
        self.value = value
        self.next = next
    }
}

class Queue<T> {
    private var head: Node<T>?
    private var tail: Node<T>?
    
    func enqueue(_ element: T) {
        let newNode = Node(value: element)
        if let tail {
            tail.next = newNode
        } else {
            head = newNode
        }
        tail = newNode
    }
    
    func dequeue() -> T? {
        guard let headNode = head else {
            return nil
        }
        head = headNode.next
        if head == nil {
            tail = nil
        }
        return headNode.value
    }
    
    func clear() {
        head = nil
        tail = nil
    }
}

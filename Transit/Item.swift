//
//  Item.swift
//  Transit
//
//  Created by Parth Parekh on 2025-09-02.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}

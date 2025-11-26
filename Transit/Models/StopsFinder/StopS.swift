//
//  StopS.swift
//  Transit
//
//  Created by Parth Parekh on 2025-09-08.
//

import Foundation

public struct StopS: Codable, Identifiable{
    public var id: Int {
        self.key ?? UUID().hashValue
    }
    let key: Int?
    let name: String?
    let number: Int?
    let direction: String?
    let side: String?
    let street: Street?
    let crossStreet: Street?
    let centre: Centre?
    let distances: Distances?
}

//
//  Stop.swift
//  TransitApp
//
//  Created by Parth Parekh on 2025-08-29.
//


import Foundation


public struct Stop: Codable {
    let key: Int?
    let name: String?
    let number: Int?
    let effectiveFrom: String?
    let effectiveTo: String?
    let direction: String?
    let side: String?
    let street: Street?
    let crossStreet: Street?
    let centre: Centre?
}

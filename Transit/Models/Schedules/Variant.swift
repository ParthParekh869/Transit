//
//  Variant.swift
//  TransitApp
//
//  Created by Parth Parekh on 2025-08-29.
//

import Foundation

public struct Variant: Codable {
    let key: String
    let name: String
    let effectiveFrom: String
    let effectiveTo: String
}

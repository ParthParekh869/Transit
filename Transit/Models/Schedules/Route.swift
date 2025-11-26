//
//  Route.swift
//  TransitApp
//
//  Created by Parth Parekh on 2025-08-27.
//

import Foundation

public struct Route: Codable {
    let key: StringOrInt?
    let number: StringOrInt?
    let name: String?
    let effectiveFrom: String?
    let effectiveTo: String?
    let customerType: String?
    let coverage: String?
    let badgeLabel: StringOrInt?
    var badgeStyle: BadgeStyle?
}

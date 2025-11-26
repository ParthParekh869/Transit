//
//  RoutesR.swift
//  Transit
//
//  Created by Parth Parekh on 2025-09-08.
//

import Foundation


public struct RoutesR: Codable {
    let key: StringOrInt?
    let number: StringOrInt?
    let name: String?
    let customerType: String?
    let coverage: String?
    let badgeLabel: StringOrInt?
    var badgeStyle: BadgeStyle?
    var variants: [VariantT]?
}

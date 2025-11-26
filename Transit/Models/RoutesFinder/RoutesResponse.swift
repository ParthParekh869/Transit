//
//  RoutesResponse.swift
//  Transit
//
//  Created by Parth Parekh on 2025-09-08.
//

import Foundation

public struct RoutesResponse: Codable {
    var routes: [RoutesR]?
    let queryTime: String
}

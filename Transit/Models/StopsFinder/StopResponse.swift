//
//  StopResponse.swift
//  Transit
//
//  Created by Parth Parekh on 2025-09-08.
//

import Foundation

public struct StopResponse: Codable {
    var stops: [StopS]?
    let queryTime: String?
}

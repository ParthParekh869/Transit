//
//  StopScheduleResponse.swift
//  TransitApp
//
//  Created by Parth Parekh on 2025-08-29.
//

import Foundation

public struct StopScheduleResponse: Codable {
    var stopSchedule: StopSchedule?
    var queryTime: String?
}

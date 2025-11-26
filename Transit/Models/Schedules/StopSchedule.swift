//
//  StopSchedule.swift
//  TransitApp
//
//  Created by Parth Parekh on 2025-08-29.
//

import Foundation

public struct StopSchedule: Codable {
    var stop: Stop?
    var routeSchedules: [RouteSchedule]?
    
    mutating func addRouteSchedule(_ routeSchedule: RouteSchedule) {
        if self.routeSchedules == nil {
            self.routeSchedules = []
        }
        self.routeSchedules?.append(routeSchedule)
    }
}

//
//  RouteSchedule.swift
//  TransitApp
//
//  Created by Parth Parekh on 2025-08-27.
//

import Foundation

public struct RouteSchedule : Codable{
    var route: Route?
    var scheduledStops: [ScheduleStop]?
    
    mutating func addScheduleStop(_ scheduledStop: ScheduleStop) {
        if self.scheduledStops == nil {
            self.scheduledStops = []
        }
        self.scheduledStops?.append(scheduledStop)
    }
}

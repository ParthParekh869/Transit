//
//  ScheduleStop.swift
//  TransitApp
//
//  Created by Parth Parekh on 2025-08-27.
//

import Foundation

public struct ScheduleStop: Codable{
    let key: String?
    var tripKey: Int64?
    var cancelled: String?
    var times: Times?
    var variant: Variant?
    var bus: Bus?
    
}

//
//  RoutesFinderResponse.swift
//  Transit
//
//  Created by Parth Parekh on 2025-11-11.
//

//import Foundation
//
//
//struct RoutesFinderResponse: Codable {
//    let plans: [Plan]
//    let queryTime: String?
//}
//
//struct Plan: Codable, Identifiable {
//    var id: String = UUID().uuidString
//    let number: Int
//    let times: [Time]
//    let segments: [Segment]
//}
//
//struct Time: Codable {
//    let start: String
//    let end: String
//    let durations: Durations
//}
//
//struct Durations: Codable {
//    let total: Int?
//    let walking: Int?
//    let waiting: Int?
//    let riding: Int?
//}
//
//struct Segment: Codable , Identifiable{
//    var id: String = UUID().uuidString
//    let type: String
//    let times: Time
//    let route: RouteR?
//    
//    
//    
//}

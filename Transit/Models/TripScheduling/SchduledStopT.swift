//
//  Schd.swift
//  Transit
//
//  Created by Parth Parekh on 2025-09-04.
//

import Foundation


public struct SchduledStopT: Codable, Identifiable{
    public var id: String { key ?? UUID().uuidString}
    let key: String?
    let stop: Stop?
    let cancelled: String?
    let times: Times?
}

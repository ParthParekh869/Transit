//
//  StringOrInt.swift
//  Transit
//
//  Created by Parth Parekh on 2025-09-17.
//


struct StringOrInt: Codable {
    let value: String
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let str = try? container.decode(String.self) {
            self.value = str
        } else if let intValue = try? container.decode(Int.self) {
            self.value = String(intValue)
        } else {
            self.value = ""
        }
    }
}

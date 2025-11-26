//
//  HttpClient.swift
//  TransitApp
//
//  Created by Parth Parekh on 2025-08-29.
//

import Foundation

class HttpClient {
    static let shared = HttpClient()
    private let session: URLSession
    
    private init() {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 60
        session = URLSession(configuration: configuration)
    }
    
    func fetchJson(_ urlString: String) async throws ->String{
        guard let url = URL(string: urlString) else {
            throw URLError(.badURL)
        }
        
        let (data, _) = try await session.data(from: url)
        
        guard let jsonString = String(data: data, encoding: .utf8) else {
            throw URLError(.cannotDecodeRawData)
        }
        
        return jsonString
    }
    
    
}

//
//  StopViewModel.swift
//  Transit
//
//  Created by Parth Parekh on 2025-10-30.
//

import Foundation

public class StopViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var stopView: RoutesResponse?
    @Published var errorMessage: String?

    func fetchStopFinding(_ stopNumber: Int) async {
        isLoading = true
        defer {
            isLoading = false
        }

        do {
            let jsonString: String = try await HttpClient.shared.fetchJson("https://api.winnipegtransit.com/v4/routes.json?api-key=AMr3dweHqDBLZaU5I26i&stop=\(stopNumber)&json-camel-case=true")
            let jsonData = jsonString.data(using: .utf8)!
            let decoded = try JSONDecoder().decode(RoutesResponse.self, from: jsonData)
            self.stopView = decoded
        }

        catch {
            errorMessage = "Error:\(error.localizedDescription) \(error)"
        }
    }
}



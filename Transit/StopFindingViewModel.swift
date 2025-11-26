//
//  StopFindingViewModel.swift
//  Transit
//
//  Created by Parth Parekh on 2025-09-08.
//

import Foundation

public class StopFindingViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var stopFindingResponse: StopResponse?
    @Published var errorMessage: String?

    func fetchStopFinding() async {
        isLoading = true
        defer {
            isLoading = false
        }

        do {
            let jsonString: String = try await HttpClient.shared.fetchJson("https://api.winnipegtransit.com/v4/stops.json?api-key=AMr3dweHqDBLZaU5I26i&lat=49.809438&lon=-97.130437&distance=1000")
            let jsonData = jsonString.data(using: .utf8)!
            let decoded = try JSONDecoder().decode(StopResponse.self, from: jsonData)
            self.stopFindingResponse = decoded
        }

        catch {
            errorMessage = "Error:\(error.localizedDescription) \(error)"
        }
    }
}

//
//  ScheduleViewModel.swift
//  TransitApp
//
//  Created by Parth Parekh on 2025-09-02.
//

import Foundation

@MainActor

public class ScheduleViewModel: ObservableObject {
    @Published var stopScheduleResponse: StopScheduleResponse?
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    
    func fetchStopSchedule(_ stopNumber: Int) async {
        isLoading = true
        defer {
            isLoading = false
        }
        
        do{
            let jsonString: String = try await HttpClient.shared.fetchJson("https://api.winnipegtransit.com/v4/stops/\(stopNumber)/schedule.json?api-key=AMr3dweHqDBLZaU5I26i&json-camel-case=true")
            let jsonData = jsonString.data(using: .utf8)!
            let decoded = try JSONDecoder().decode(StopScheduleResponse.self, from: jsonData)
            self.stopScheduleResponse = decoded
        }
        catch {
            errorMessage = "\(error)"
        }
    }
}

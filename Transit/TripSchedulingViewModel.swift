

import Foundation

@MainActor

public class TripSchedulingViewModel: ObservableObject {
    @Published var tripScheduleResponse: TripSchedule?
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?


    func fetchTripSchedule() async {
        isLoading = true
        defer {
            isLoading = false
        }
        
        do {
            let jsonString: String = try await HttpClient.shared.fetchJson("https://api.winnipegtransit.com/v4/trips/30982015.json?api-key=AMr3dweHqDBLZaU5I26i&json-camel-case=true")
            let jsonData = jsonString.data(using: .utf8)!
            let decoded = try JSONDecoder().decode(TripSchedule.self, from: jsonData)
            self.tripScheduleResponse = decoded
        }

        catch {
            errorMessage = "\(error)"
        }
    }
    
}

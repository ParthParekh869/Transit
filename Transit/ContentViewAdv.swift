//
//  ContentViewAdv.swift
//  Transit
//
//  Created by Parth Parekh on 2025-09-02.
//

import SwiftUI

struct ContentViewAdv: View {
    private let stopNumber: Int?
    @StateObject var viewModel = ScheduleViewModel()
    @State private var selectedTheme: Int = 0

    init(stopNumber: Int? = nil) {
        // Transparent Navigation Bar Setup
        self.stopNumber = stopNumber
        let appearance = UINavigationBarAppearance()
        appearance.configureWithTransparentBackground()
        appearance.backgroundColor = .clear
        appearance.backgroundEffect = nil
        appearance.titleTextAttributes = [.foregroundColor: UIColor.white]
        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
        UINavigationBar.appearance().compactAppearance = appearance
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {

                // MARK: - Background
                backgroundForTheme(selectedTheme)
                    .ignoresSafeArea()

                VStack(spacing: 16) {
                    // MARK: - Header + Theme Selector
                    VStack(spacing: 10) {
                        Text("Stop Schedule")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.white)

                        HStack(spacing: 10) {
                            ForEach(0..<themes.count, id: \.self) { i in
                                Circle()
                                    .fill(themes[i].colors.first ?? .blue)
                                    .frame(width: 26, height: 26)
                                    .overlay(
                                        Circle()
                                            .stroke(Color.white.opacity(i == selectedTheme ? 1 : 0), lineWidth: 2)
                                    )
                                    .onTapGesture { withAnimation { selectedTheme = i } }
                            }
                        }
                    }
                    .padding(.top, 12)

                    // MARK: - Loading
                    if viewModel.isLoading {
                        VStack(spacing: 12) {
                            ProgressView()
                                .tint(.white)
                            Text("Fetching schedules…")
                                .font(.headline)
                                .foregroundColor(.white.opacity(0.7))
                        }
                        .padding(.top, 30)
                    }

                    // MARK: - Schedule Data
                    else if let response = viewModel.stopScheduleResponse {
                        VStack(spacing: 8) {
                            Text(response.stopSchedule?.stop?.name ?? "No stop name")
                                .font(.title2)
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                                .multilineTextAlignment(.center)

                            Text("#\(response.stopSchedule?.stop?.number ?? 0)")
                                .font(.headline)
                                .foregroundColor(.white.opacity(0.8))

                            Text("Updated: \(formatDate(response.queryTime ?? "No update time"))")
                                .font(.footnote)
                                .foregroundColor(.white.opacity(0.6))
                        }
                        .padding(.top, 12)

                        ScrollView(showsIndicators: false) {
                            LazyVStack(spacing: 16) {
                                ForEach(response.stopSchedule?.routeSchedules ?? [], id: \.route?.key?.value) { routeSchedule in
                                    VStack(alignment: .leading, spacing: 10) {
                                        // Route Header
                                        HStack {
                                            Text(routeSchedule.route?.key?.value ?? "")
                                                .font(.title3)
                                                .fontWeight(.bold)
                                                .foregroundColor(Color(hex: routeSchedule.route?.badgeStyle?.color ?? "#007AFF"))
                                                .padding(.horizontal, 14)
                                                .padding(.vertical, 6)
                                                .background(
                                                    Color(hex: routeSchedule.route?.badgeStyle?.backgroundColor ?? "#007AFF")
                                                )
                                                .clipShape(Capsule())

                                            Spacer()

                                            Text(routeSchedule.route?.name ?? "No route name")
                                                .font(.headline)
                                                .foregroundColor(.white.opacity(0.9))
                                        }

                                        // Scheduled Stops
                                        VStack(spacing: 10) {
                                            ForEach(routeSchedule.scheduledStops ?? [], id: \.tripKey) { stop in
                                                HStack {
                                                    VStack(alignment: .leading, spacing: 4) {
                                                        Text(stop.variant?.name ?? "No Variant")
                                                            .font(.subheadline)
                                                            .fontWeight(.semibold)
                                                            .foregroundColor(.white)
                                                    }

                                                    Spacer()

                                                    // Bus timing badge
                                                    let timeDelay = durationInMinutes(
                                                        left: stop.times?.departure?.estimated ?? "",
                                                        right: stop.times?.departure?.scheduled ?? ""
                                                    )

                                                    if timeDelay < 0 {
                                                        badge(text: "LATE", color: .red)
                                                    } else if timeDelay > 0 {
                                                        badge(text: "ERLY", color: .green)
                                                    } else {
                                                        badge(text: "ON TIME", color: .gray)
                                                    }

                                                    let arrivalDiff = durationInMinutes(
                                                        left: response.queryTime ?? "",
                                                        right: stop.times?.departure?.estimated ?? ""
                                                    )

                                                    let textTime: String =
                                                    arrivalDiff == 0 ? "DUE" :
                                                    arrivalDiff < 15 ? "\(arrivalDiff) min" :
                                                    formatDate(stop.times?.departure?.estimated ?? "")

                                                    Text(textTime)
                                                        .font(.headline)
                                                        .foregroundColor(.blue)
                                                }
                                                .padding()
                                                .background(.ultraThinMaterial)
                                                .cornerRadius(16)
                                                .shadow(color: .black.opacity(0.25), radius: 4, x: 0, y: 2)
                                            }
                                        }
                                    }
                                    .padding(.horizontal)
                                }
                            }
                            .padding(.bottom, 80)
                        }
                    }

                    // MARK: - Error Handling
                    else if let error = viewModel.errorMessage {
                        VStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 40))
                                .foregroundColor(.red)
                            Text(error)
                                .font(.body)
                                .foregroundColor(.white)
                        }
                        .padding(.top, 40)
                    }

                    else {
                        VStack {
                            Image(systemName: "xmark.octagon.fill")
                                .font(.system(size: 40))
                                .foregroundColor(.white.opacity(0.6))
                            Text("Error fetching schedules.")
                                .font(.body)
                                .foregroundColor(.white.opacity(0.8))
                        }
                        .padding(.top, 40)
                    }
                }

                // MARK: - Bottom NavBar
                customNavBar
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                if let stopNumber = stopNumber {
                    await viewModel.fetchStopSchedule(stopNumber)
                }
                else{
                    await viewModel.fetchStopSchedule(40222)
                }
                
            }
        }
    }

    // MARK: - Background Themes
    private let themes: [(colors: [Color], name: String)] = [
        ([.indigo.opacity(0.45), .purple.opacity(0.35), .blue.opacity(0.3)], "Default"),
        ([.orange.opacity(0.5), .pink.opacity(0.4), .purple.opacity(0.35)], "Sunset"),
        ([.green.opacity(0.45), .mint.opacity(0.4), .teal.opacity(0.35)], "Forest"),
        ([.black.opacity(0.9), .gray.opacity(0.4)], "Midnight"),
        ([.cyan.opacity(0.5), .blue.opacity(0.4), .indigo.opacity(0.3)], "Ocean")
    ]

    private func backgroundForTheme(_ index: Int) -> some View {
        LinearGradient(
            colors: themes[index].colors,
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    // MARK: - Components
    private func badge(text: String, color: Color) -> some View {
        Text(text)
            .font(.caption2)
            .padding(6)
            .background(color.opacity(0.25))
            .foregroundColor(color)
            .clipShape(Capsule())
    }

    private var customNavBar: some View {
        HStack(spacing: 40) {
            navBarButton(icon: "map.fill", title: "Maps")
            navBarButton(icon: "tram.fill", title: "Nearby Stops")
            navBarButton(icon: "clock.fill", title: "Schedules", isSelected: true)
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 25)
        .background(.ultraThinMaterial)
        .clipShape(Capsule())
        .shadow(radius: 5)
        .padding(.bottom, 10)
    }

    private func navBarButton(icon: String, title: String, isSelected: Bool = false) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(isSelected ? .blue : .white.opacity(0.8))
            Text(title)
                .font(.caption)
                .foregroundColor(isSelected ? .blue : .white.opacity(0.8))
        }
    }

    // MARK: - Utilities
    private func formatDate(_ isoString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        if let date = formatter.date(from: isoString) {
            let out = DateFormatter()
            out.dateFormat = "hh:mm a"
            return out.string(from: date)
        }
        return isoString
    }

    private func durationInMinutes(left: String, right: String) -> Int {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        guard let leftDate = formatter.date(from: left),
              let rightDate = formatter.date(from: right)
        else { return 0 }
        return Int(rightDate.timeIntervalSince(leftDate) / 60)
    }
}

#Preview {
    ContentViewAdv(stopNumber: 41070)
        .preferredColorScheme(.dark)
}


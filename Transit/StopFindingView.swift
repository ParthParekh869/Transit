//
//  StopsView.swift
//  Transit
//
//  Created by Parth Parekh on 2025-10-30.
//

import SwiftUI
import CoreLocation

struct StopsView: View {
    @StateObject private var stopFinder = StopFindingViewModel()
    @State private var searchText: String = ""
    @State private var selectedTheme: Int = 0  // index of selected theme

    init() {
        // Transparent navigation bar appearance
        let appearance = UINavigationBarAppearance()
        appearance.configureWithTransparentBackground()
        appearance.backgroundColor = .clear
        appearance.backgroundEffect = nil
        appearance.titleTextAttributes = [.foregroundColor: UIColor.white]
        appearance.largeTitleTextAttributes = [.foregroundColor: UIColor.white]
        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
        UINavigationBar.appearance().compactAppearance = appearance
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                // MARK: - Gradient Background
                backgroundForTheme(selectedTheme)
                    .ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 20) {
                        
                        // MARK: - Title + Search Bar
                        VStack(spacing: 8) {
                            Text("Stops Near You")
                                .font(.largeTitle)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .padding(.top, 10)

                            HStack {
                                Image(systemName: "magnifyingglass")
                                    .foregroundColor(.white.opacity(0.7))
                                TextField("Search stops…", text: $searchText)
                                    .textFieldStyle(PlainTextFieldStyle())
                                    .foregroundColor(.white)
                            }
                            .padding(10)
                            .background(Color.white.opacity(0.15))
                            .cornerRadius(12)
                            .padding(.horizontal)
                        }

                        // MARK: - Theme Selector
                        HStack(spacing: 10) {
                            ForEach(0..<themes.count, id: \.self) { i in
                                Circle()
                                    .fill(themes[i].colors.first ?? .blue)
                                    .frame(width: 26, height: 26)
                                    .overlay(
                                        Circle().stroke(Color.white.opacity(i == selectedTheme ? 1 : 0), lineWidth: 2)
                                    )
                                    .onTapGesture { withAnimation { selectedTheme = i } }
                            }
                        }
                        .padding(.bottom, 10)

                        // MARK: - Stops List
                        if stopFinder.isLoading {
                            ProgressView("Loading nearby stops…")
                                .tint(.white)
                                .font(.headline)
                                .padding(.top, 30)
                        }
                        else if let response = stopFinder.stopFindingResponse,
                                let stops = response.stops, !stops.isEmpty {

                            let currentLocation = CLLocationCoordinate2D(latitude: 49.809438, longitude: -97.130437)

                            ForEach(stops.filter {
                                searchText.isEmpty || ($0.name?.localizedCaseInsensitiveContains(searchText) ?? false)
                            }, id: \.key) { stop in

                                let lat = stop.centre?.geographic?.latitude ?? 0
                                let lon = stop.centre?.geographic?.longitude ?? 0
                                let coord = CLLocationCoordinate2D(latitude: lat, longitude: lon)
                                let distance = distanceBetween(coord, currentLocation)

                                // ✅ NEW: Tap to navigate into ContentViewAdv(stopNumber:)
                                NavigationLink(destination: ContentViewAdv(stopNumber: stop.number ?? 0)) {
                                    StopCardLoader(
                                        stopName: stop.name ?? "Unknown Stop",
                                        stopNumber: stop.number ?? 0,
                                        distance: distance
                                    )
                                    .padding(.horizontal)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        else if let error = stopFinder.errorMessage {
                            VStack(spacing: 12) {
                                Image(systemName: "xmark.octagon.fill")
                                    .font(.system(size: 50))
                                    .foregroundStyle(.red, .white)
                                Text(error)
                                    .font(.body)
                                    .foregroundColor(.white.opacity(0.8))
                            }
                            .padding(.top, 60)
                        } else {
                            Text("No stops found nearby.")
                                .foregroundColor(.white.opacity(0.8))
                                .padding(.top, 60)
                        }
                    }
                    .padding(.vertical, 30)
                    .padding(.bottom, 80) // leave space for bottom bar
                }

                // MARK: - Bottom Navigation Bar
                customNavBar
            }
            .task { await stopFinder.fetchStopFinding() }
        }
    }

    // MARK: - Background themes
    private let themes: [(colors: [Color], name: String)] = [
        ([.indigo.opacity(0.45), .purple.opacity(0.35), .blue.opacity(0.3)], "Default"),
        ([.orange.opacity(0.5), .pink.opacity(0.4), .purple.opacity(0.35)], "Sunset"),
        ([.green.opacity(0.45), .mint.opacity(0.4), .teal.opacity(0.35)], "Forest"),
        ([.black.opacity(0.9), .gray.opacity(0.4)], "Midnight"),
        ([.cyan.opacity(0.5), .blue.opacity(0.4), .indigo.opacity(0.3)], "Ocean"),
        ([.green.opacity(0.45), .purple.opacity(0.4), .blue.opacity(0.35)], "Aurora")
    ]

    private func backgroundForTheme(_ index: Int) -> some View {
        LinearGradient(
            colors: themes[index].colors,
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    // MARK: - Helper: Distance between coordinates
    func distanceBetween(_ c1: CLLocationCoordinate2D, _ c2: CLLocationCoordinate2D) -> Double {
        CLLocation(latitude: c1.latitude, longitude: c1.longitude)
            .distance(from: CLLocation(latitude: c2.latitude, longitude: c2.longitude))
    }

    // MARK: - Custom Bottom Nav Bar
    private var customNavBar: some View {
        HStack(spacing: 40) {
            navBarButton(icon: "map.fill", title: "Maps")
            navBarButton(icon: "tram.fill", title: "Nearby Stops", isSelected: true)
            navBarButton(icon: "star.fill", title: "Favorites")
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
}

// MARK: - StopCardLoader & StopCard (unchanged from your version)
struct StopCardLoader: View {
    let stopName: String
    let stopNumber: Int
    let distance: Double
    @StateObject private var viewModel = StopViewModel()
    @State private var isLoaded = false

    var body: some View {
        Group {
            if isLoaded, let response = viewModel.stopView {
                StopCard(
                    stopName: stopName,
                    stopNumber: stopNumber,
                    distance: distance,
                    routes: response.routes ?? []
                )
            } else {
                ProgressView("Loading \(stopName)…")
                    .tint(.white)
                    .padding()
            }
        }
        .task {
            await viewModel.fetchStopFinding(stopNumber)
            await MainActor.run { isLoaded = true }
        }
    }
}

struct StopCard: View {
    let stopName: String
    let stopNumber: Int
    let distance: Double
    let routes: [RoutesR]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(stopName)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)

                HStack(spacing: 8) {
                    Text("#\(String(format: "%.0d", stopNumber))")
                    Text(formattedDistance(distance))
                }
                .font(.caption)
                .foregroundColor(.white.opacity(0.7))
            }

            Divider().background(Color.white.opacity(0.4))

            LayoutThatWrapsHorizontally(spacing: 10) {
                ForEach(routes, id: \.key?.value) { route in
                    Text(route.key?.value ?? "Route")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(Color(hex: route.badgeStyle?.color ?? "#007AFF"))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(Color(hex: route.badgeStyle?.backgroundColor ?? "#007AFF"))
                        .clipShape(Capsule())
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 22)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 22)
                        .stroke(Color.white.opacity(0.25), lineWidth: 0.8)
                )
        )
        .shadow(color: .black.opacity(0.25), radius: 6, x: 0, y: 4)
    }

    private func formattedDistance(_ meters: Double) -> String {
        if meters >= 1000 {
            let km = meters / 1000
            return String(format: km.truncatingRemainder(dividingBy: 1) == 0 ? "%.0f km away" : "%.1f km away", km)
        } else {
            return String(format: "%.0f m away", meters)
        }
    }
}

struct LayoutThatWrapsHorizontally: Layout {
    var spacing: CGFloat = 10

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        let maxWidth = proposal.width ?? .infinity

        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > maxWidth {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: maxWidth, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x: CGFloat = bounds.minX
        var y: CGFloat = bounds.minY
        var rowHeight: CGFloat = 0

        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            view.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}

#Preview {
    StopsView()
        .preferredColorScheme(.dark)
}


//
//  BusLiveView.swift
//  Transit
//
//  Created by Parth Parekh on 2025-09-04.
//

import SwiftUI
import MapKit

struct BusLiveView: View {
    @StateObject var tripView = TripSchedulingViewModel()
    @State private var searchText: String = ""

    var body: some View {
        NavigationStack {
            ZStack {
                // MARK: - Frosted Gradient Background
                LinearGradient(
                    colors: [.indigo.opacity(0.45), .purple.opacity(0.35), .blue.opacity(0.3)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                VStack {
                    // MARK: - Title & Search Bar
                    VStack(spacing: 10) {
                        Text("Live Bus Tracker")
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

                    // MARK: - Content
                    if tripView.isLoading {
                        VStack(spacing: 8) {
                            ProgressView("Going Live...")
                                .tint(.white)
                            Text("Fetching route and positions…")
                                .font(.subheadline)
                                .foregroundColor(.white.opacity(0.7))
                        }
                        .padding(.top, 40)
                    }

                    else if let response = tripView.tripScheduleResponse {
                        if let scheduledStops = response.trip?.scheduledStops {
                            VStack(spacing: 16) {
                                BusRouteMap(scheduledStops: scheduledStops)
                                    .frame(height: 300)
                                    .cornerRadius(16)
                                    .padding(.horizontal)
                                    .shadow(color: .black.opacity(0.25), radius: 8, x: 0, y: 4)

                                ScrollView {
                                    LazyVStack(spacing: 12) {
                                        ForEach(scheduledStops.filter { stop in
                                            searchText.isEmpty || (stop.stop?.name?.localizedCaseInsensitiveContains(searchText) ?? false)
                                        }, id: \.key) { scheduledStop in

                                            HStack {
                                                VStack(alignment: .leading, spacing: 4) {
                                                    Text(scheduledStop.stop?.name ?? "Unnamed Stop")
                                                        .font(.headline)
                                                        .foregroundColor(.white)

                                                    if let lat = scheduledStop.stop?.centre?.geographic?.latitude,
                                                       let lon = scheduledStop.stop?.centre?.geographic?.longitude {
                                                        Text("(\(String(format: "%.4f", lat)), \(String(format: "%.4f", lon)))")
                                                            .font(.caption)
                                                            .foregroundColor(.white.opacity(0.7))
                                                    }
                                                }

                                                Spacer()

                                                Image(systemName: "bus.fill")
                                                    .foregroundColor(.blue)
                                                    .font(.title3)
                                            }
                                            .padding()
                                            .background(
                                                RoundedRectangle(cornerRadius: 16)
                                                    .fill(.ultraThinMaterial)
                                                .overlay(
                                                        RoundedRectangle(cornerRadius: 16)
                                                            .stroke(Color.white.opacity(0.25), lineWidth: 0.8)
                                                    )
                                            )
                                            .shadow(color: .black.opacity(0.2), radius: 3, x: 0, y: 2)
                                            .padding(.horizontal)
                                        }
                                    }
                                    .padding(.vertical)
                                }
                            }
                        }
                    }

                    else {
                        Text(tripView.errorMessage ?? "An error occurred.")
                            .font(.body)
                            .foregroundColor(.white.opacity(0.8))
                            .padding(.top, 60)
                    }
                }
            }
            .navigationTitle("Bus Live Map")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await tripView.fetchTripSchedule()
            }
        }
    }
}

struct BusRouteMap: View {
    var scheduledStops: [SchduledStopT]
    @State private var region: MKCoordinateRegion

    init(scheduledStops: [SchduledStopT]) {
        if let lat = scheduledStops.first?.stop?.centre?.geographic?.latitude,
           let long = scheduledStops.first?.stop?.centre?.geographic?.longitude {
            _region = State(initialValue: MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: lat, longitude: long),
                span: MKCoordinateSpan(latitudeDelta: 0.005, longitudeDelta: 0.005)
            ))
        
        } else {
            _region = State(initialValue: MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: 0.0, longitude: 0.0),
                span: MKCoordinateSpan(latitudeDelta: 1.0, longitudeDelta: 1.0)
            ))
        }
        self.scheduledStops = scheduledStops
    }

    var body: some View {
        Map(initialPosition: .region(region)) {
            // Route Line
            let coordinates: [CLLocationCoordinate2D] = scheduledStops.compactMap {
                if let lat = $0.stop?.centre?.geographic?.latitude,
                   let long = $0.stop?.centre?.geographic?.longitude {
                    return CLLocationCoordinate2D(latitude: lat, longitude: long)
                }
                return nil
            }

            if !coordinates.isEmpty {
                MapPolyline(coordinates: coordinates)
                    .stroke(Color.red, lineWidth: 3)
            }

            // Stop Annotations
            ForEach(scheduledStops, id: \.id) { scheduledStop in
                if let lat = scheduledStop.stop?.centre?.geographic?.latitude,
                   let long = scheduledStop.stop?.centre?.geographic?.longitude {
                    Annotation(scheduledStop.stop?.name ?? "Stop",
                               coordinate: CLLocationCoordinate2D(latitude: lat, longitude: long)) {
                        Circle()
                            .fill(Color.blue)
                            .frame(width: 10, height: 10)
                            .overlay(Circle().stroke(Color.white, lineWidth: 2))
                    }
                }
            }
        }
        .mapStyle(.hybrid)
        .cornerRadius(12)
    }
}

#Preview {
    BusLiveView()
        .preferredColorScheme(.dark)
}


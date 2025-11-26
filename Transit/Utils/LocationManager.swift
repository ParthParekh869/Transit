//
//  LocationManager.swift
//  Transit
//
//  Created by Parth Parekh on 2025-10-30.
//
    
import Foundation
import CoreLocation

@MainActor
public final class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    
    // For async single-shot requests
    private var continuation: CheckedContinuation<CLLocation, Error>?
    
    // For async continuous stream
    private var locationContinuation: AsyncStream<CLLocation>.Continuation?
    private var streamInitialized = false
    
    @Published public private(set) var location: CLLocation?
    @Published public private(set) var authorizationStatus: CLAuthorizationStatus = .notDetermined
    
    override public init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.requestAlwaysAuthorization()
        manager.startUpdatingLocation()
    }
    
    // MARK: - Async one-time location request
    public func requestLocation() async throws -> CLLocation {
        if let last = manager.location {
            location = last
            return last
        }
        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            manager.requestLocation()
        }
    }

    // MARK: - Async continuous stream of locations
    public func locationStream() -> AsyncStream<CLLocation> {
        // Initialize stream only once per instance
        if !streamInitialized {
            streamInitialized = true
            return AsyncStream { continuation in
                self.locationContinuation = continuation
            }
        } else {
            // Return a new stream tied to the same continuation
            return AsyncStream { continuation in
                self.locationContinuation = continuation
            }
        }
    }

    // MARK: - Delegate methods (nonisolated in Swift 6)
    nonisolated public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let latest = locations.last else { return }
        Task { @MainActor in
            self.location = latest
            // Resume one-time request if waiting
            self.continuation?.resume(returning: latest)
            self.continuation = nil
            // Yield to async stream listeners
            self.locationContinuation?.yield(latest)
        }
    }

    nonisolated public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            self.continuation?.resume(throwing: error)
            self.continuation = nil
            self.locationContinuation?.finish()
        }
    }

    nonisolated public func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        Task { @MainActor in
            self.authorizationStatus = status
        }
    }

    nonisolated public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            self.authorizationStatus = manager.authorizationStatus
        }
    }
}


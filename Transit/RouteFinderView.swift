//
//  RouteFinderView.swift
//  Transit
//
//  Created by Parth Parekh on 2025-11-11.
//

//
//  RouteFinderView.swift
//  Transit
//
//  Created by Parth Parekh on 2025-11-11.
//

import SwiftUI
import CoreLocation

struct RouteFinderView: View {
    @State private var originText: String = ""
    @State private var destinationText: String = ""
    @State private var selectedTheme: Int = 0
    @FocusState private var isTextFieldFocused: Bool
    @State private var isLoading: Bool = false
    
    init() {
        // Transparent nav bar like StopsView
        let appearance = UINavigationBarAppearance()
        appearance.configureWithTransparentBackground()
        appearance.backgroundColor = .clear
        appearance.titleTextAttributes = [.foregroundColor: UIColor.white]
        appearance.largeTitleTextAttributes = [.foregroundColor: UIColor.white]
        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
    }
    
    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                backgroundForTheme(selectedTheme)
                    .ignoresSafeArea()
                
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 24) {
                        // MARK: - Title
                        Text("Find Your Route")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.top, 10)
                        
                        // MARK: - Origin Field
                        searchField(
                            title: "From:",
                            text: $originText,
                            icon: "location.fill"
                        )
                        
                        // MARK: - Destination Field
                        searchField(
                            title: "To:",
                            text: $destinationText,
                            icon: "mappin.and.ellipse"
                        )
                        
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
                        
                        // MARK: - Search Button
                        Button(action: { findRoutes() }) {
                            Label("Find Routes", systemImage: "tram.fill")
                                .font(.headline)
                                .foregroundColor(.white)
                                .padding(.vertical, 12)
                                .padding(.horizontal, 60)
                                .background(.blue.gradient)
                                .clipShape(Capsule())
                                .shadow(radius: 5)
                        }
                        .padding(.top, 10)
                        
                        // MARK: - Placeholder Results
                        if isLoading {
                            ProgressView("Finding best routes…")
                                .tint(.white)
                                .padding(.top, 20)
                        } else if !originText.isEmpty && !destinationText.isEmpty {
                            VStack(spacing: 15) {
                                routeCard(routeName: "Route 60 Pembina", estTime: "25 min", distance: "12 km")
                                routeCard(routeName: "Route 162 Express", estTime: "18 min", distance: "10 km")
                                routeCard(routeName: "Route 47 Transcona", estTime: "30 min", distance: "15 km")
                            }
                            .padding(.top, 20)
                        } else {
                            Text("Enter both locations to search routes.")
                                .foregroundColor(.white.opacity(0.8))
                                .padding(.top, 30)
                        }
                    }
                    .padding(.bottom, 100)
                    .padding(.horizontal)
                }
                
                // MARK: - Bottom Bar
                customNavBar
            }
        }
    }
    
    // MARK: - Helper Subviews
    private func searchField(title: String, text: Binding<String>, icon: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.headline)
                .foregroundColor(.white.opacity(0.8))
            
            HStack {
                Image(systemName: icon)
                    .foregroundColor(.white.opacity(0.7))
                TextField(title, text: text)
                    .textFieldStyle(PlainTextFieldStyle())
                    .foregroundColor(.white)
                    .focused($isTextFieldFocused)
            }
            .padding(10)
            .background(Color.white.opacity(0.15))
            .cornerRadius(12)
        }
    }
    
    private func routeCard(routeName: String, estTime: String, distance: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(routeName)
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(.white)
            HStack {
                Label(estTime, systemImage: "clock")
                Label(distance, systemImage: "location")
            }
            .font(.caption)
            .foregroundColor(.white.opacity(0.7))
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.white.opacity(0.25), lineWidth: 0.8)
                )
        )
        .shadow(radius: 5)
    }
    
    // MARK: - Find Routes (placeholder async)
    private func findRoutes() {
        guard !originText.isEmpty, !destinationText.isEmpty else { return }
        isLoading = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            isLoading = false
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
    
    // MARK: - Custom Bottom Nav Bar
    private var customNavBar: some View {
        HStack(spacing: 40) {
            navBarButton(icon: "map.fill", title: "Maps")
            navBarButton(icon: "arrow.triangle.swap", title: "Find Route", isSelected: true)
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

#Preview {
    RouteFinderView()
        .preferredColorScheme(.dark)
}

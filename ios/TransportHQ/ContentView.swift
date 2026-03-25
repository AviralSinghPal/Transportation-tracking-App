import SwiftUI

struct ContentView: View {
    @ObservedObject private var authService = AuthService.shared
    @State private var selectedTab = 0

    var body: some View {
        if authService.isAuthenticated, let user = authService.currentUser {
            VStack(spacing: 0) {
                // Content based on role and tab
                Group {
                    switch user.role {
                    case .coordinator:
                        coordinatorContent
                    case .driver:
                        driverContent
                    case .passenger:
                        passengerContent
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)

                TabBarView(role: user.role, selectedTab: $selectedTab)
            }
            .ignoresSafeArea(.keyboard)
            .onAppear {
                authService.restoreSession()
            }
        } else {
            LoginView()
        }
    }

    @ViewBuilder
    var coordinatorContent: some View {
        switch selectedTab {
        case 0: DashboardView()
        case 1: LiveMapView()
        case 2: RideRequestsView()
        case 3: TripsView()
        case 4: MoreView()
        default: DashboardView()
        }
    }

    @ViewBuilder
    var driverContent: some View {
        switch selectedTab {
        case 0: DriverTripsView()
        case 1: DriverRidesView()
        case 2: MoreView()
        default: DriverTripsView()
        }
    }

    @ViewBuilder
    var passengerContent: some View {
        switch selectedTab {
        case 0: PassengerTripsView()
        case 1: PassengerRidesView()
        case 2: MoreView()
        default: PassengerTripsView()
        }
    }
}

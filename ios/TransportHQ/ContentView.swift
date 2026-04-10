import SwiftUI

struct ContentView: View {
    @ObservedObject private var authService = AuthService.shared
    @State private var selectedTab = 0
    @State private var showNotifications = false
    @State private var showChat = false

    var body: some View {
        if authService.isAuthenticated, let user = authService.currentUser {
            VStack(spacing: 0) {
                // Top bar with notification bell
                HStack {
                    Text("TransportHQ")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    Spacer()
                    Button {
                        showChat = true
                    } label: {
                        Image(systemName: "message.fill")
                            .foregroundColor(.white)
                            .font(.system(size: 18))
                    }
                    Button {
                        showNotifications = true
                    } label: {
                        Image(systemName: "bell.fill")
                            .foregroundColor(.white)
                            .font(.system(size: 18))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Theme.primary)

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
            .sheet(isPresented: $showNotifications) {
                NotificationsView()
            }
            .sheet(isPresented: $showChat) {
                ChatView()
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
        case 2: DriverMapView()
        case 3: MoreView()
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

import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = CoordinatorDashboardViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Theme.paddingMedium) {
                    // Welcome Header
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Dashboard")
                                .font(Theme.titleFont)
                                .foregroundColor(Theme.gray900)
                            Text(formattedDate)
                                .font(Theme.captionFont)
                                .foregroundColor(Theme.gray500)
                        }
                        Spacer()
                        Button {
                            AuthService.shared.logout()
                        } label: {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                                .foregroundColor(Theme.gray500)
                        }
                    }
                    .padding(.horizontal)

                    // Stats Grid
                    LazyVGrid(columns: [
                        GridItem(.flexible(), spacing: 12),
                        GridItem(.flexible(), spacing: 12)
                    ], spacing: 12) {
                        StatCard(
                            title: "Active Trips",
                            value: "\(viewModel.activeTrips)",
                            icon: "road.lanes",
                            color: Theme.primary
                        )
                        StatCard(
                            title: "Completed",
                            value: "\(viewModel.completedTrips)",
                            icon: "checkmark.circle.fill",
                            color: Theme.green
                        )
                        StatCard(
                            title: "Pending Requests",
                            value: "\(viewModel.pendingRequests)",
                            icon: "clock.fill",
                            color: Theme.orange
                        )
                        StatCard(
                            title: "Available Vehicles",
                            value: "\(viewModel.availableVehicles)",
                            icon: "car.fill",
                            color: Theme.blue
                        )
                    }
                    .padding(.horizontal)

                    // Recent Pending Requests
                    if !viewModel.rideRequests.filter({ $0.status == .pending }).isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Pending Requests")
                                .font(Theme.headlineFont)
                                .foregroundColor(Theme.gray900)
                                .padding(.horizontal)

                            ForEach(viewModel.rideRequests.filter({ $0.status == .pending }).prefix(5)) { request in
                                PendingRequestCard(request: request)
                                    .padding(.horizontal)
                            }
                        }
                    }

                    // Active Trips
                    if !viewModel.trips.filter({ $0.status.isActive || $0.status == .assigned }).isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Active Trips")
                                .font(Theme.headlineFont)
                                .foregroundColor(Theme.gray900)
                                .padding(.horizontal)

                            ForEach(viewModel.trips.filter({ $0.status.isActive || $0.status == .assigned }).prefix(5)) { trip in
                                ActiveTripCard(trip: trip)
                                    .padding(.horizontal)
                            }
                        }
                    }

                    Spacer(minLength: 80)
                }
                .padding(.top)
            }
            .background(Theme.gray50.ignoresSafeArea())
            .refreshable {
                await viewModel.loadAll()
            }
            .task {
                await viewModel.loadAll()
            }
        }
    }

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d, yyyy"
        return formatter.string(from: Date())
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundColor(color)
                    .frame(width: 32, height: 32)
                    .background(color.opacity(0.1))
                    .cornerRadius(8)
                Spacer()
            }
            Text(value)
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundColor(Theme.gray900)
            Text(title)
                .font(Theme.captionFont)
                .foregroundColor(Theme.gray500)
        }
        .padding()
        .cardStyle()
    }
}

struct PendingRequestCard: View {
    let request: RideRequest

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(request.passenger?.fullName ?? "Unknown")
                    .font(Theme.subheadlineFont)
                    .foregroundColor(Theme.gray900)
                Spacer()
                if let priority = request.priority {
                    StatusBadge(priority: priority)
                }
            }
            HStack(spacing: 4) {
                Image(systemName: "mappin.circle.fill")
                    .foregroundColor(Theme.green)
                    .font(.system(size: 14))
                Text(request.pickupLocation?.address ?? "N/A")
                    .font(Theme.captionFont)
                    .foregroundColor(Theme.gray600)
                    .lineLimit(1)
            }
            HStack(spacing: 4) {
                Image(systemName: "mappin.circle.fill")
                    .foregroundColor(Theme.red)
                    .font(.system(size: 14))
                Text(request.dropoffLocation?.address ?? "N/A")
                    .font(Theme.captionFont)
                    .foregroundColor(Theme.gray600)
                    .lineLimit(1)
            }
            if let status = request.status {
                StatusBadge(rideStatus: status)
            }
        }
        .padding()
        .cardStyle()
    }
}

struct ActiveTripCard: View {
    let trip: Trip

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(trip.driver?.fullName ?? "Unassigned")
                    .font(Theme.subheadlineFont)
                    .foregroundColor(Theme.gray900)
                Spacer()
                StatusBadge(tripStatus: trip.status)
            }
            if let vehicle = trip.vehicle {
                HStack(spacing: 4) {
                    Image(systemName: "car.fill")
                        .foregroundColor(Theme.gray400)
                        .font(.system(size: 12))
                    Text(vehicle.displayName)
                        .font(Theme.captionFont)
                        .foregroundColor(Theme.gray600)
                }
            }
            HStack(spacing: 4) {
                Image(systemName: "mappin.circle.fill")
                    .foregroundColor(Theme.green)
                    .font(.system(size: 14))
                Text(trip.pickupLocation?.address ?? trip.rideRequest?.pickupLocation?.address ?? "N/A")
                    .font(Theme.captionFont)
                    .foregroundColor(Theme.gray600)
                    .lineLimit(1)
            }
        }
        .padding()
        .cardStyle()
    }
}

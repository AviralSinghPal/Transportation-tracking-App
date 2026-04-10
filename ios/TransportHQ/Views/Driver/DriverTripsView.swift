import SwiftUI

struct DriverTripsView: View {
    @StateObject private var viewModel = DriverTripsViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // GPS Sharing Banner
                    if viewModel.isLocationSharing {
                        HStack(spacing: 8) {
                            PulsingDot(color: Theme.green)
                            Text("GPS Location Sharing Active")
                                .font(Theme.captionFont)
                                .foregroundColor(Theme.green)
                            Spacer()
                        }
                        .padding(12)
                        .background(Theme.green.opacity(0.08))
                        .cornerRadius(Theme.cornerRadiusSmall)
                        .padding(.horizontal)
                    }

                    // Active Trips
                    if !viewModel.activeTrips.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Active Trips")
                                .font(Theme.headlineFont)
                                .foregroundColor(Theme.gray900)
                                .padding(.horizontal)

                            ForEach(viewModel.activeTrips) { trip in
                                DriverTripCard(trip: trip) {
                                    Task { await viewModel.updateStatus(trip: trip) }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }

                    // Completed Trips
                    if !viewModel.completedTrips.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Completed Today")
                                .font(Theme.headlineFont)
                                .foregroundColor(Theme.gray900)
                                .padding(.horizontal)

                            ForEach(viewModel.completedTrips) { trip in
                                DriverTripCard(trip: trip, onStatusUpdate: nil)
                                    .padding(.horizontal)
                            }
                        }
                    }

                    if viewModel.activeTrips.isEmpty && viewModel.completedTrips.isEmpty {
                        EmptyStateView(
                            icon: "road.lanes",
                            title: "No Trips Today",
                            subtitle: "Your assigned trips will appear here"
                        )
                    }

                    Spacer(minLength: 80)
                }
                .padding(.top)
            }
            .background(Theme.gray50.ignoresSafeArea())
            .navigationTitle("My Trips")
            .refreshable {
                await viewModel.loadTrips()
            }
            .task {
                await viewModel.loadTrips()
            }
            .overlay {
                if let success = viewModel.statusUpdateSuccess {
                    SuccessToast(message: success)
                        .onAppear {
                            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                                viewModel.statusUpdateSuccess = nil
                            }
                        }
                }
            }
        }
    }
}

struct DriverTripCard: View {
    let trip: Trip
    var onStatusUpdate: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Trip")
                        .font(Theme.subheadlineFont)
                        .foregroundColor(Theme.gray900)
                    if let passenger = trip.rideRequest?.passenger {
                        Text("Passenger: \(passenger.fullName)")
                            .font(Theme.captionFont)
                            .foregroundColor(Theme.gray500)
                    }
                }
                Spacer()
                StatusBadge(tripStatus: trip.status)
            }

            // Vehicle
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

            Divider()

            // Locations
            HStack(spacing: 4) {
                Image(systemName: "mappin.circle.fill")
                    .foregroundColor(Theme.green)
                    .font(.system(size: 14))
                Text(trip.displayPickup)
                    .font(Theme.captionFont)
                    .foregroundColor(Theme.gray600)
                    .lineLimit(2)
            }

            HStack(spacing: 4) {
                Image(systemName: "mappin.circle.fill")
                    .foregroundColor(Theme.red)
                    .font(.system(size: 14))
                Text(trip.displayDropoff)
                    .font(Theme.captionFont)
                    .foregroundColor(Theme.gray600)
                    .lineLimit(2)
            }

            // Navigate buttons
            if trip.status.isActive {
                HStack(spacing: 8) {
                    let pickupAddr = trip.displayPickup == "N/A" ? "" : trip.displayPickup
                    let dropoffAddr = trip.displayDropoff == "N/A" ? "" : trip.displayDropoff
                    if !pickupAddr.isEmpty && (trip.status == .assigned || trip.status == .driverDeparted) {
                        Button {
                            if let url = URL(string: "http://maps.apple.com/?daddr=\(pickupAddr.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") {
                                UIApplication.shared.open(url)
                            }
                        } label: {
                            Label("Navigate to Pickup", systemImage: "arrow.triangle.turn.up.right.circle.fill")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(Theme.green)
                                .padding(.horizontal, 8).padding(.vertical, 6)
                                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Theme.green, lineWidth: 1))
                        }
                    }
                    if !dropoffAddr.isEmpty && (trip.status == .arrivedPickup || trip.status == .inProgress) {
                        Button {
                            if let url = URL(string: "http://maps.apple.com/?daddr=\(dropoffAddr.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") {
                                UIApplication.shared.open(url)
                            }
                        } label: {
                            Label("Navigate to Dropoff", systemImage: "arrow.triangle.turn.up.right.circle.fill")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(Theme.red)
                                .padding(.horizontal, 8).padding(.vertical, 6)
                                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Theme.red, lineWidth: 1))
                        }
                    }
                }
            }

            // Passenger phone
            if let phone = trip.rideRequest?.passenger?.phone, !phone.isEmpty {
                Button {
                    if let url = URL(string: "tel://\(phone)") {
                        UIApplication.shared.open(url)
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "phone.fill")
                            .font(.system(size: 12))
                        Text("Call Passenger")
                            .font(Theme.captionFont)
                    }
                    .foregroundColor(Theme.primary)
                }
            }

            // Status Update Button
            if let label = trip.status.nextStatusLabel, let onStatusUpdate = onStatusUpdate {
                Button(action: onStatusUpdate) {
                    Text(label)
                        .font(Theme.subheadlineFont)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(statusButtonColor(for: trip.status))
                        .cornerRadius(Theme.cornerRadiusSmall)
                }
                .padding(.top, 4)
            }
        }
        .padding()
        .cardStyle()
    }

    func statusButtonColor(for status: TripStatus) -> Color {
        switch status {
        case .unassigned: return Theme.gray400
        case .assigned: return Theme.blue
        case .driverDeparted: return Theme.orange
        case .arrivedPickup: return Theme.primary
        case .inProgress: return Theme.green
        default: return Theme.gray400
        }
    }
}

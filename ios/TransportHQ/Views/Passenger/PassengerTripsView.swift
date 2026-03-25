import SwiftUI

struct PassengerTripsView: View {
    @State private var trips: [Trip] = []
    @State private var isLoading = false

    var activeTrips: [Trip] {
        trips.filter { $0.status != .completed && $0.status != .cancelled }
    }

    var pastTrips: [Trip] {
        trips.filter { $0.status == .completed || $0.status == .cancelled }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 12) {
                    if !activeTrips.isEmpty {
                        Text("Active")
                            .font(Theme.headlineFont)
                            .foregroundColor(Theme.gray900)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        ForEach(activeTrips) { trip in
                            PassengerTripCard(trip: trip)
                        }
                    }

                    if !pastTrips.isEmpty {
                        Text("Past Trips")
                            .font(Theme.headlineFont)
                            .foregroundColor(Theme.gray900)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.top, 8)

                        ForEach(pastTrips) { trip in
                            PassengerTripCard(trip: trip)
                        }
                    }

                    if trips.isEmpty && !isLoading {
                        EmptyStateView(
                            icon: "road.lanes",
                            title: "No Trips",
                            subtitle: "Your trips will appear here once a ride is assigned"
                        )
                    }
                }
                .padding()
                .padding(.bottom, 80)
            }
            .background(Theme.gray50.ignoresSafeArea())
            .navigationTitle("My Trips")
            .refreshable {
                await loadTrips()
            }
            .task {
                await loadTrips()
            }
        }
    }

    func loadTrips() async {
        isLoading = true
        do {
            trips = try await APIService.shared.getTrips()
        } catch {
            print("Failed to load trips: \(error)")
        }
        isLoading = false
    }
}

struct PassengerTripCard: View {
    let trip: Trip

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    if let driver = trip.driver {
                        Text("Driver: \(driver.fullName)")
                            .font(Theme.subheadlineFont)
                            .foregroundColor(Theme.gray900)
                    }
                    if let vehicle = trip.vehicle {
                        Text(vehicle.displayName)
                            .font(Theme.captionFont)
                            .foregroundColor(Theme.gray500)
                    }
                }
                Spacer()
                StatusBadge(tripStatus: trip.status)
            }

            Divider()

            HStack(spacing: 4) {
                Image(systemName: "mappin.circle.fill")
                    .foregroundColor(Theme.green)
                    .font(.system(size: 14))
                Text(trip.pickupLocation?.address ?? trip.rideRequest?.pickupLocation?.address ?? "N/A")
                    .font(Theme.captionFont)
                    .foregroundColor(Theme.gray600)
                    .lineLimit(1)
            }

            HStack(spacing: 4) {
                Image(systemName: "mappin.circle.fill")
                    .foregroundColor(Theme.red)
                    .font(.system(size: 14))
                Text(trip.dropoffLocation?.address ?? trip.rideRequest?.dropoffLocation?.address ?? "N/A")
                    .font(Theme.captionFont)
                    .foregroundColor(Theme.gray600)
                    .lineLimit(1)
            }

            if trip.status.isActive, let driverId = trip.driver?.id {
                NavigationLink(destination: TrackDriverView(driverId: driverId, rideRequestId: nil)) {
                    HStack(spacing: 6) {
                        PulsingDot(color: Theme.green)
                        Text("Track Driver Live")
                            .font(Theme.subheadlineFont)
                            .foregroundColor(.white)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Theme.green)
                    .cornerRadius(Theme.cornerRadiusSmall)
                }
            }
        }
        .padding()
        .cardStyle()
    }
}

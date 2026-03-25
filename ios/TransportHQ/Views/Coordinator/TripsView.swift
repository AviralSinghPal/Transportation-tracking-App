import SwiftUI

struct TripsView: View {
    @State private var trips: [Trip] = []
    @State private var isLoading = false
    @State private var selectedSegment = 0

    let segments = ["Active", "Completed", "All"]

    var filteredTrips: [Trip] {
        switch selectedSegment {
        case 0: return trips.filter { $0.status != .completed && $0.status != .cancelled }
        case 1: return trips.filter { $0.status == .completed }
        default: return trips
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Filter", selection: $selectedSegment) {
                    ForEach(0..<segments.count, id: \.self) { index in
                        Text(segments[index]).tag(index)
                    }
                }
                .pickerStyle(.segmented)
                .padding()

                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(filteredTrips) { trip in
                            TripCard(trip: trip)
                        }

                        if filteredTrips.isEmpty {
                            EmptyStateView(
                                icon: "road.lanes",
                                title: "No \(segments[selectedSegment]) Trips",
                                subtitle: "Trips will appear here"
                            )
                        }
                    }
                    .padding()
                    .padding(.bottom, 80)
                }
                .refreshable {
                    await loadTrips()
                }
            }
            .background(Theme.gray50.ignoresSafeArea())
            .navigationTitle("Trips")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await loadTrips()
            }
        }
    }

    func loadTrips() async {
        isLoading = true
        do {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            trips = try await APIService.shared.getTrips(date: formatter.string(from: Date()))
        } catch {
            print("Failed to load trips: \(error)")
        }
        isLoading = false
    }
}

struct TripCard: View {
    let trip: Trip

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(trip.driver?.fullName ?? "Unassigned Driver")
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

            if let eta = trip.eta {
                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .foregroundColor(Theme.gray400)
                        .font(.system(size: 12))
                    Text("ETA: \(eta)")
                        .font(Theme.captionFont)
                        .foregroundColor(Theme.gray500)
                }
            }
        }
        .padding()
        .cardStyle()
    }
}

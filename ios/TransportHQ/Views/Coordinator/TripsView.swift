import SwiftUI

struct TripsView: View {
    @State private var trips: [Trip] = []
    @State private var isLoading = false
    @State private var selectedFilter = "All"
    @State private var showCreateTrip = false

    let filterOptions = ["All", "Unassigned", "Assigned", "In Progress", "Completed"]

    var filteredTrips: [Trip] {
        switch selectedFilter {
        case "Unassigned":
            return trips.filter { $0.status == .unassigned }
        case "Assigned":
            return trips.filter { $0.status == .assigned }
        case "In Progress":
            return trips.filter { $0.status == .driverDeparted || $0.status == .arrivedPickup || $0.status == .inProgress }
        case "Completed":
            return trips.filter { $0.status == .completed }
        default:
            return trips
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(filterOptions, id: \.self) { filter in
                            Button(filter) {
                                selectedFilter = filter
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(selectedFilter == filter ? Theme.primary : Theme.gray100)
                            .foregroundColor(selectedFilter == filter ? .white : Theme.gray600)
                            .cornerRadius(20)
                            .font(.system(size: 13, weight: .medium))
                        }
                    }
                    .padding(.horizontal, 16)
                }
                .padding(.vertical, 12)

                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(filteredTrips) { trip in
                            NavigationLink(destination: TripDetailView(tripId: trip.id)) {
                                TripCard(trip: trip)
                            }
                            .buttonStyle(.plain)
                        }

                        if filteredTrips.isEmpty {
                            EmptyStateView(
                                icon: "road.lanes",
                                title: "No \(selectedFilter) Trips",
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
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showCreateTrip = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .task {
                await loadTrips()
            }
            .sheet(isPresented: $showCreateTrip) {
                CreateTripSheet(onCreated: {
                    showCreateTrip = false
                    Task { await loadTrips() }
                })
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
                Text(trip.displayPickup)
                    .font(Theme.captionFont)
                    .foregroundColor(Theme.gray600)
                    .lineLimit(1)
            }

            HStack(spacing: 4) {
                Image(systemName: "mappin.circle.fill")
                    .foregroundColor(Theme.red)
                    .font(.system(size: 14))
                Text(trip.displayDropoff)
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

import SwiftUI

struct PassengerTripsView: View {
    @State private var trips: [Trip] = []
    @State private var isLoading = false
    @State private var showRatingSheet = false
    @State private var ratingTripId: String? = nil
    @State private var ratedTrips: Set<String> = []

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
                            VStack(spacing: 0) {
                                PassengerTripCard(trip: trip)

                                if trip.status == .completed {
                                    if ratedTrips.contains(trip.id) {
                                        HStack(spacing: 4) {
                                            Image(systemName: "checkmark.circle.fill")
                                                .font(.system(size: 12))
                                                .foregroundColor(Theme.green)
                                            Text("Rated")
                                                .font(Theme.captionFont)
                                                .foregroundColor(Theme.green)
                                        }
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 8)
                                        .background(Theme.green.opacity(0.08))
                                        .cornerRadius(Theme.cornerRadiusSmall)
                                        .padding(.horizontal, 16)
                                        .padding(.top, -4)
                                    } else {
                                        Button {
                                            ratingTripId = trip.id
                                            showRatingSheet = true
                                        } label: {
                                            HStack(spacing: 4) {
                                                Image(systemName: "star.fill")
                                                    .font(.system(size: 12))
                                                Text("Rate Trip")
                                                    .font(Theme.captionFont)
                                                    .fontWeight(.semibold)
                                            }
                                            .foregroundColor(.white)
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 8)
                                            .background(Theme.primary)
                                            .cornerRadius(Theme.cornerRadiusSmall)
                                        }
                                        .padding(.horizontal, 16)
                                        .padding(.top, -4)
                                    }
                                }
                            }
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
            .sheet(isPresented: $showRatingSheet) {
                if let tripId = ratingTripId {
                    TripRatingSheet(tripId: tripId, onSubmit: {
                        ratedTrips.insert(tripId)
                    })
                }
            }
        }
    }

    func loadTrips() async {
        isLoading = true
        do {
            trips = try await APIService.shared.getTrips()
            await checkRatingsForCompletedTrips()
        } catch {
            print("Failed to load trips: \(error)")
        }
        isLoading = false
    }

    func checkRatingsForCompletedTrips() async {
        let completedTrips = trips.filter { $0.status == .completed }
        for trip in completedTrips {
            do {
                let result = try await APIService.shared.checkTripRating(tripId: trip.id)
                if result.hasRated == true {
                    ratedTrips.insert(trip.id)
                }
            } catch {}
        }
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

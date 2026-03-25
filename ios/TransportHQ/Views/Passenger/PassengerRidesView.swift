import SwiftUI

struct PassengerRidesView: View {
    @StateObject private var viewModel = MyRidesViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 12) {
                    if !viewModel.activeRides.isEmpty {
                        Text("Active Requests")
                            .font(Theme.headlineFont)
                            .foregroundColor(Theme.gray900)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        ForEach(viewModel.activeRides) { ride in
                            PassengerRideCard(ride: ride)
                        }
                    }

                    if !viewModel.pastRides.isEmpty {
                        Text("Past Requests")
                            .font(Theme.headlineFont)
                            .foregroundColor(Theme.gray900)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.top, 8)

                        ForEach(viewModel.pastRides) { ride in
                            PassengerRideCard(ride: ride)
                        }
                    }

                    if viewModel.rides.isEmpty && !viewModel.isLoading {
                        EmptyStateView(
                            icon: "car.fill",
                            title: "No Ride Requests",
                            subtitle: "Tap + to create a new ride request"
                        )
                    }
                }
                .padding()
                .padding(.bottom, 80)
            }
            .background(Theme.gray50.ignoresSafeArea())
            .navigationTitle("My Rides")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        viewModel.showCreateSheet = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(Theme.primary)
                            .font(.system(size: 24))
                    }
                }
            }
            .refreshable {
                await viewModel.loadRides()
            }
            .task {
                await viewModel.loadRides()
            }
            .sheet(isPresented: $viewModel.showCreateSheet) {
                RideRequestSheet { pickup, dropoff, time, count, priority, dept, notes in
                    await viewModel.createRide(
                        pickup: pickup,
                        dropoff: dropoff,
                        pickupTime: time,
                        passengerCount: count,
                        priority: priority,
                        department: dept,
                        notes: notes
                    )
                }
            }
            .overlay {
                if let success = viewModel.createSuccess {
                    SuccessToast(message: success)
                        .onAppear {
                            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                                viewModel.createSuccess = nil
                            }
                        }
                }
            }
        }
    }
}

struct PassengerRideCard: View {
    let ride: RideRequest

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    if let dept = ride.department, !dept.isEmpty {
                        Text(dept)
                            .font(Theme.captionFont)
                            .foregroundColor(Theme.gray500)
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    if let status = ride.status {
                        StatusBadge(rideStatus: status)
                    }
                    if let priority = ride.priority {
                        StatusBadge(priority: priority)
                    }
                }
            }

            HStack(spacing: 4) {
                Image(systemName: "mappin.circle.fill")
                    .foregroundColor(Theme.green)
                    .font(.system(size: 14))
                Text(ride.pickupLocation?.address ?? "N/A")
                    .font(Theme.captionFont)
                    .foregroundColor(Theme.gray600)
                    .lineLimit(1)
            }

            HStack(spacing: 4) {
                Image(systemName: "mappin.circle.fill")
                    .foregroundColor(Theme.red)
                    .font(.system(size: 14))
                Text(ride.dropoffLocation?.address ?? "N/A")
                    .font(Theme.captionFont)
                    .foregroundColor(Theme.gray600)
                    .lineLimit(1)
            }

            if let driver = ride.driver {
                Divider()
                HStack(spacing: 8) {
                    Circle()
                        .fill(Theme.primary.opacity(0.1))
                        .frame(width: 32, height: 32)
                        .overlay(
                            Image(systemName: "person.fill")
                                .foregroundColor(Theme.primary)
                                .font(.system(size: 14))
                        )
                    VStack(alignment: .leading, spacing: 1) {
                        Text(driver.fullName)
                            .font(Theme.captionFont)
                            .foregroundColor(Theme.gray800)
                        if let vehicle = ride.vehicle {
                            Text(vehicle.displayName)
                                .font(Theme.smallFont)
                                .foregroundColor(Theme.gray500)
                        }
                    }
                    Spacer()

                    if let driverId = ride.driver?.id,
                       ride.status == .assigned || ride.status == .inProgress {
                        NavigationLink(destination: TrackDriverView(driverId: driverId, rideRequestId: ride.id)) {
                            HStack(spacing: 4) {
                                PulsingDot(color: .white)
                                Text("Track Live")
                                    .font(Theme.smallFont)
                                    .foregroundColor(.white)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Theme.green)
                            .cornerRadius(16)
                        }
                    }
                }
            }

            if let time = ride.pickupTime {
                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .foregroundColor(Theme.gray400)
                        .font(.system(size: 12))
                    Text(formatDate(time))
                        .font(Theme.captionFont)
                        .foregroundColor(Theme.gray500)
                }
            }

            if let notes = ride.notes, !notes.isEmpty {
                Text(notes)
                    .font(Theme.captionFont)
                    .foregroundColor(Theme.gray500)
                    .lineLimit(2)
            }
        }
        .padding()
        .cardStyle()
    }

    func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: dateString) {
            let display = DateFormatter()
            display.dateFormat = "MMM d, h:mm a"
            return display.string(from: date)
        }
        let formatter2 = ISO8601DateFormatter()
        if let date = formatter2.date(from: dateString) {
            let display = DateFormatter()
            display.dateFormat = "MMM d, h:mm a"
            return display.string(from: date)
        }
        return dateString
    }
}

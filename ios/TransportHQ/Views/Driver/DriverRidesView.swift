import SwiftUI

struct DriverRidesView: View {
    @StateObject private var viewModel = MyRidesViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 12) {
                    if !viewModel.activeRides.isEmpty {
                        ForEach(viewModel.activeRides) { ride in
                            DriverRideCard(ride: ride)
                        }
                    }

                    if !viewModel.pastRides.isEmpty {
                        Text("Past Rides")
                            .font(Theme.headlineFont)
                            .foregroundColor(Theme.gray900)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.top, 8)

                        ForEach(viewModel.pastRides) { ride in
                            DriverRideCard(ride: ride)
                        }
                    }

                    if viewModel.rides.isEmpty && !viewModel.isLoading {
                        EmptyStateView(
                            icon: "car.fill",
                            title: "No Rides",
                            subtitle: "Your assigned rides will appear here"
                        )
                    }
                }
                .padding()
                .padding(.bottom, 80)
            }
            .background(Theme.gray50.ignoresSafeArea())
            .navigationTitle("My Rides")
            .refreshable {
                await viewModel.loadRides()
            }
            .task {
                await viewModel.loadRides()
            }
        }
    }
}

struct DriverRideCard: View {
    let ride: RideRequest

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(ride.passenger?.fullName ?? "Passenger")
                    .font(Theme.subheadlineFont)
                    .foregroundColor(Theme.gray900)
                Spacer()
                if let status = ride.status {
                    StatusBadge(rideStatus: status)
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
        return dateString
    }
}

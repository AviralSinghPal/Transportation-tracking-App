import Foundation
import Combine

@MainActor
final class DriverTripsViewModel: ObservableObject {
    @Published var trips: [Trip] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var statusUpdateSuccess: String?
    @Published var isLocationSharing = false

    private var cancellables = Set<AnyCancellable>()
    private let locationService = LocationService.shared

    var activeTrips: [Trip] {
        trips.filter { $0.status != .completed && $0.status != .cancelled }
    }

    var completedTrips: [Trip] {
        trips.filter { $0.status == .completed }
    }

    var hasActiveTrip: Bool {
        trips.contains { $0.status.isActive }
    }

    init() {
        locationService.$isSharing
            .receive(on: DispatchQueue.main)
            .assign(to: &$isLocationSharing)
    }

    func loadTrips() async {
        isLoading = true
        errorMessage = nil
        do {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            let today = formatter.string(from: Date())
            trips = try await APIService.shared.getTrips(date: today)
            updateLocationSharing()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func updateStatus(trip: Trip) async {
        guard let nextStatus = trip.status.nextStatus else { return }

        let location = locationService.currentLocation.map {
            GeoPoint(lat: $0.coordinate.latitude, lng: $0.coordinate.longitude)
        }

        do {
            _ = try await APIService.shared.updateTripStatus(
                tripId: trip.id,
                status: nextStatus.rawValue,
                location: location
            )
            triggerHaptic()
            statusUpdateSuccess = "Status updated to \(nextStatus.displayName)"
            await loadTrips()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func updateLocationSharing() {
        if hasActiveTrip {
            locationService.startTracking()
        } else {
            locationService.stopTracking()
        }
    }

    private func triggerHaptic() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
    }
}

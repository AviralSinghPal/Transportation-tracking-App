import Foundation
import UIKit

@MainActor
final class TripDetailViewModel: ObservableObject {
    @Published var trip: Trip?
    @Published var events: [TripEvent] = []
    @Published var drivers: [Driver] = []
    @Published var vehicles: [Vehicle] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var actionSuccess: String?
    @Published var showAssignSheet = false
    @Published var selectedDriverId = ""
    @Published var selectedVehicleId = ""

    func loadTrip(id: String) async {
        isLoading = true
        do {
            let detail = try await APIService.shared.getTripDetail(id: id)
            trip = detail.trip
            events = detail.events ?? []
            drivers = try await APIService.shared.getAvailableDrivers()
            vehicles = try await APIService.shared.getVehicles()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func assignTrip(tripId: String) async {
        guard !selectedDriverId.isEmpty, !selectedVehicleId.isEmpty else {
            errorMessage = "Select a driver and vehicle"
            return
        }
        do {
            let result = try await APIService.shared.assignTrip(id: tripId, driverId: selectedDriverId, vehicleId: selectedVehicleId)
            trip = result
            showAssignSheet = false
            triggerHaptic()
            actionSuccess = "Trip assigned"
            await loadTrip(id: tripId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func cancelTrip(tripId: String) async {
        do {
            try await APIService.shared.cancelTrip(id: tripId)
            triggerHaptic()
            actionSuccess = "Trip cancelled"
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func triggerHaptic() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
    }
}

import Foundation
import UIKit

@MainActor
final class PermanentAllocationsViewModel: ObservableObject {
    @Published var trips: [PermanentTrip] = []
    @Published var drivers: [Driver] = []
    @Published var vehicles: [Vehicle] = []
    @Published var isLoading = false
    @Published var actionSuccess: String?
    @Published var errorMessage: String?
    @Published var showCreateSheet = false
    @Published var showSwapDriver = false
    @Published var showSwapVehicle = false
    @Published var selectedTrip: PermanentTrip?

    // Create form
    @Published var formTitle = ""
    @Published var formPickup = ""
    @Published var formDropoff = ""
    @Published var formTime = "8:00 AM"
    @Published var formStartDate = ""
    @Published var formEndDate = ""

    // Swap form
    @Published var swapSelectedId = ""
    @Published var swapReason = ""

    var activeCount: Int { trips.filter { $0.status == "active" || $0.status == "in_use" }.count }
    var draftCount: Int { trips.filter { $0.status == "draft" }.count }
    var pausedCount: Int { trips.filter { $0.status == "paused" }.count }

    func loadData() async {
        isLoading = true
        do {
            async let t = APIService.shared.getPermanentTrips()
            async let d = APIService.shared.getDrivers()
            async let v = APIService.shared.getVehicles()
            trips = try await t
            drivers = try await d
            vehicles = try await v
        } catch { errorMessage = error.localizedDescription }
        isLoading = false
    }

    func createTrip() async {
        guard !formTitle.isEmpty, !formPickup.isEmpty, !formDropoff.isEmpty else { return }
        do {
            let body: [String: Any] = [
                "title": formTitle, "pickupLocation": formPickup, "dropoffLocation": formDropoff,
                "scheduledTime": formTime, "startDate": formStartDate, "endDate": formEndDate,
                "activeDays": ["Mon", "Tue", "Wed", "Thu", "Fri"]
            ]
            _ = try await APIService.shared.createPermanentTrip(body: body)
            showCreateSheet = false; resetForm(); triggerHaptic()
            actionSuccess = "Allocation created"
            await loadData()
        } catch { errorMessage = error.localizedDescription }
    }

    func activate(trip: PermanentTrip) async {
        do { _ = try await APIService.shared.activatePermanentTrip(id: trip.id); triggerHaptic(); actionSuccess = "Activated"; await loadData() }
        catch { errorMessage = error.localizedDescription }
    }

    func pause(trip: PermanentTrip) async {
        do { _ = try await APIService.shared.pausePermanentTrip(id: trip.id); triggerHaptic(); actionSuccess = "Paused"; await loadData() }
        catch { errorMessage = error.localizedDescription }
    }

    func delete(trip: PermanentTrip) async {
        do { try await APIService.shared.deletePermanentTrip(id: trip.id); triggerHaptic(); actionSuccess = "Deleted"; await loadData() }
        catch { errorMessage = error.localizedDescription }
    }

    func swapDriver() async {
        guard let trip = selectedTrip else { return }
        do {
            _ = try await APIService.shared.swapPermanentTripDriver(id: trip.id, newDriverId: swapSelectedId.isEmpty ? nil : swapSelectedId, reason: swapReason)
            showSwapDriver = false; triggerHaptic(); actionSuccess = "Driver swapped"; await loadData()
        } catch { errorMessage = error.localizedDescription }
    }

    func swapVehicle() async {
        guard let trip = selectedTrip else { return }
        do {
            _ = try await APIService.shared.swapPermanentTripVehicle(id: trip.id, newVehicleId: swapSelectedId.isEmpty ? nil : swapSelectedId, reason: swapReason)
            showSwapVehicle = false; triggerHaptic(); actionSuccess = "Vehicle swapped"; await loadData()
        } catch { errorMessage = error.localizedDescription }
    }

    func beginSwapDriver(trip: PermanentTrip) { selectedTrip = trip; swapSelectedId = ""; swapReason = ""; showSwapDriver = true }
    func beginSwapVehicle(trip: PermanentTrip) { selectedTrip = trip; swapSelectedId = ""; swapReason = ""; showSwapVehicle = true }

    func resetForm() { formTitle = ""; formPickup = ""; formDropoff = ""; formTime = "8:00 AM"; formStartDate = ""; formEndDate = "" }

    private func triggerHaptic() { let g = UINotificationFeedbackGenerator(); g.notificationOccurred(.success) }
}

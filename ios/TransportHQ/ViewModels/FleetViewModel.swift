import Foundation
import UIKit

@MainActor
final class FleetViewModel: ObservableObject {
    @Published var vehicles: [Vehicle] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var actionSuccess: String?
    @Published var showAddSheet = false
    @Published var showDeleteConfirm = false
    @Published var vehicleToDelete: Vehicle?

    // Form fields
    @Published var formName = ""
    @Published var formPlateNumber = ""
    @Published var formType = "sedan"
    @Published var formCapacity = "4"

    var totalCount: Int { vehicles.count }
    var availableCount: Int { vehicles.filter { $0.status == .available }.count }
    var inUseCount: Int { vehicles.filter { $0.status == .inUse }.count }
    var maintenanceCount: Int { vehicles.filter { $0.status == .maintenance }.count }

    func loadVehicles() async {
        isLoading = true
        do {
            vehicles = try await APIService.shared.getVehicles()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func createVehicle() async {
        guard !formName.isEmpty, !formPlateNumber.isEmpty else {
            errorMessage = "Name and plate number are required"
            return
        }
        do {
            let body: [String: Any] = [
                "name": formName,
                "plateNumber": formPlateNumber,
                "type": formType,
                "capacity": Int(formCapacity) ?? 4
            ]
            _ = try await APIService.shared.createVehicle(body: body)
            triggerHaptic()
            showAddSheet = false
            resetForm()
            actionSuccess = "Vehicle added"
            await loadVehicles()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func updateStatus(vehicle: Vehicle, newStatus: String) async {
        do {
            _ = try await APIService.shared.updateVehicle(id: vehicle.id, body: ["status": newStatus])
            triggerHaptic()
            actionSuccess = "Status updated"
            await loadVehicles()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func confirmDelete(vehicle: Vehicle) {
        vehicleToDelete = vehicle
        showDeleteConfirm = true
    }

    func deleteVehicle() async {
        guard let vehicle = vehicleToDelete else { return }
        do {
            try await APIService.shared.deleteVehicle(id: vehicle.id)
            triggerHaptic()
            showDeleteConfirm = false
            vehicleToDelete = nil
            actionSuccess = "Vehicle deleted"
            await loadVehicles()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func resetForm() {
        formName = ""
        formPlateNumber = ""
        formType = "sedan"
        formCapacity = "4"
    }

    private func triggerHaptic() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
    }
}

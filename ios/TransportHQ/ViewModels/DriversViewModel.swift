import Foundation
import UIKit

@MainActor
final class DriversViewModel: ObservableObject {
    @Published var drivers: [Driver] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var actionSuccess: String?
    @Published var showAddSheet = false

    // Form fields
    @Published var formName = ""
    @Published var formPhone = ""
    @Published var formLicense = ""

    var totalCount: Int { drivers.count }
    var availableCount: Int { drivers.filter { $0.isAvailable == true }.count }
    var unavailableCount: Int { totalCount - availableCount }

    func loadDrivers() async {
        isLoading = true
        do {
            drivers = try await APIService.shared.getDrivers()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func toggleAvailability(driver: Driver) async {
        let newAvailability = !(driver.isAvailable ?? true)
        do {
            _ = try await APIService.shared.toggleDriverAvailability(id: driver.id, isAvailable: newAvailability)
            triggerHaptic()
            actionSuccess = newAvailability ? "\(driver.fullName) set available" : "\(driver.fullName) set unavailable"
            await loadDrivers()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func createTempDriver() async {
        guard !formName.isEmpty, !formPhone.isEmpty else {
            errorMessage = "Name and phone are required"
            return
        }
        do {
            _ = try await APIService.shared.createTempDriver(
                name: formName, phone: formPhone,
                licenseNumber: formLicense.isEmpty ? nil : formLicense
            )
            triggerHaptic()
            showAddSheet = false
            resetForm()
            actionSuccess = "Temporary driver created"
            await loadDrivers()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func resetForm() {
        formName = ""
        formPhone = ""
        formLicense = ""
    }

    private func triggerHaptic() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
    }
}

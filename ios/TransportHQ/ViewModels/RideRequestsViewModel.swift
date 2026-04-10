import Foundation
import UIKit
import Combine
import UIKit

@MainActor
final class RideRequestsViewModel: ObservableObject {
    @Published var rideRequests: [RideRequest] = []
    @Published var drivers: [Driver] = []
    @Published var vehicles: [Vehicle] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showAssignSheet = false
    @Published var selectedRequest: RideRequest?
    @Published var selectedDriverId: String = ""
    @Published var selectedVehicleId: String = ""
    @Published var eta: String = ""
    @Published var actionSuccess: String?
    @Published var showRejectAlert = false
    @Published var rejectionReason = ""
    @Published var requestToReject: RideRequest?

    private var cancellables = Set<AnyCancellable>()

    var pendingRequests: [RideRequest] {
        rideRequests.filter { $0.status == .pending }
    }

    var approvedRequests: [RideRequest] {
        rideRequests.filter { $0.status == .approved }
    }

    var assignedRequests: [RideRequest] {
        rideRequests.filter { $0.status == .assigned || $0.status == .inProgress }
    }

    var completedRequests: [RideRequest] {
        rideRequests.filter { $0.status == .completed || $0.status == .cancelled || $0.status == .rejected }
    }

    init() {
        SocketService.shared.rideRequestNewSubject
            .receive(on: DispatchQueue.main)
            .sink { [weak self] in
                Task { await self?.loadRideRequests() }
            }
            .store(in: &cancellables)

        SocketService.shared.rideRequestUpdatedSubject
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                Task { await self?.loadRideRequests() }
            }
            .store(in: &cancellables)
    }

    func loadAll() async {
        isLoading = true
        async let r1: () = loadRideRequests()
        async let r2: () = loadDrivers()
        async let r3: () = loadVehicles()
        _ = await (r1, r2, r3)
        isLoading = false
    }

    func loadRideRequests() async {
        do {
            rideRequests = try await APIService.shared.getRideRequests()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func loadDrivers() async {
        do {
            drivers = try await APIService.shared.getDrivers()
        } catch {
            print("Failed to load drivers: \(error)")
        }
    }

    func loadVehicles() async {
        do {
            vehicles = try await APIService.shared.getVehicles()
        } catch {
            print("Failed to load vehicles: \(error)")
        }
    }

    func approve(request: RideRequest) async {
        do {
            _ = try await APIService.shared.approveRideRequest(id: request.id)
            triggerHaptic()
            actionSuccess = "Ride request approved"
            await loadRideRequests()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func beginReject(request: RideRequest) {
        requestToReject = request
        rejectionReason = ""
        showRejectAlert = true
    }

    func reject() async {
        guard let request = requestToReject else { return }
        do {
            _ = try await APIService.shared.rejectRideRequest(id: request.id, reason: rejectionReason)
            triggerHaptic()
            showRejectAlert = false
            requestToReject = nil
            rejectionReason = ""
            actionSuccess = "Ride request rejected"
            await loadRideRequests()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func beginAssign(request: RideRequest) {
        selectedRequest = request
        selectedDriverId = ""
        selectedVehicleId = ""
        eta = ""
        showAssignSheet = true
    }

    func assign() async {
        guard let request = selectedRequest,
              !selectedDriverId.isEmpty,
              !selectedVehicleId.isEmpty else {
            errorMessage = "Please select a driver and vehicle"
            return
        }
        do {
            _ = try await APIService.shared.assignRideRequest(
                id: request.id,
                driverId: selectedDriverId,
                vehicleId: selectedVehicleId,
                eta: Int(eta) ?? 15
            )
            triggerHaptic()
            showAssignSheet = false
            actionSuccess = "Ride request assigned"
            await loadRideRequests()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func triggerHaptic() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
    }
}

import Foundation
import Combine

@MainActor
final class MyRidesViewModel: ObservableObject {
    @Published var rides: [RideRequest] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showCreateSheet = false
    @Published var createSuccess: String?

    private var cancellables = Set<AnyCancellable>()

    var activeRides: [RideRequest] {
        rides.filter { $0.status != .completed && $0.status != .cancelled && $0.status != .rejected }
    }

    var pastRides: [RideRequest] {
        rides.filter { $0.status == .completed || $0.status == .cancelled || $0.status == .rejected }
    }

    init() {
        SocketService.shared.rideRequestUpdatedSubject
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                Task { await self?.loadRides() }
            }
            .store(in: &cancellables)
    }

    func loadRides() async {
        isLoading = true
        errorMessage = nil
        do {
            rides = try await APIService.shared.getRideRequests()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func createRide(pickup: String, dropoff: String, pickupTime: Date, passengerCount: Int, priority: String, department: String, notes: String) async {
        let formatter = ISO8601DateFormatter()
        let pickupTimeStr = formatter.string(from: pickupTime)

        do {
            _ = try await APIService.shared.createRideRequest(
                pickup: pickup,
                dropoff: dropoff,
                pickupTime: pickupTimeStr,
                passengerCount: passengerCount,
                priority: priority,
                department: department,
                notes: notes
            )
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.success)
            showCreateSheet = false
            createSuccess = "Ride request created successfully"
            await loadRides()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

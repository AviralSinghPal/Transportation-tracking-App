import Foundation
import Combine

@MainActor
final class CoordinatorDashboardViewModel: ObservableObject {
    @Published var trips: [Trip] = []
    @Published var rideRequests: [RideRequest] = []
    @Published var vehicles: [Vehicle] = []
    @Published var drivers: [Driver] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private var cancellables = Set<AnyCancellable>()

    var todayString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }

    var activeTrips: Int {
        trips.filter { $0.status.isActive || $0.status == .assigned }.count
    }

    var completedTrips: Int {
        trips.filter { $0.status == .completed }.count
    }

    var pendingRequests: Int {
        rideRequests.filter { $0.status == .pending }.count
    }

    var availableVehicles: Int {
        vehicles.filter { $0.status == .available }.count
    }

    var availableDrivers: Int {
        drivers.filter { $0.isActive == true }.count
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
                Task { await self?.loadAll() }
            }
            .store(in: &cancellables)
    }

    func loadAll() async {
        isLoading = true
        errorMessage = nil
        async let tripsTask: () = loadTrips()
        async let ridesTask: () = loadRideRequests()
        async let vehiclesTask: () = loadVehicles()
        async let driversTask: () = loadDrivers()
        _ = await (tripsTask, ridesTask, vehiclesTask, driversTask)
        isLoading = false
    }

    func loadTrips() async {
        do {
            trips = try await APIService.shared.getTrips(date: todayString)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func loadRideRequests() async {
        do {
            rideRequests = try await APIService.shared.getRideRequests()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func loadVehicles() async {
        do {
            vehicles = try await APIService.shared.getVehicles()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func loadDrivers() async {
        do {
            drivers = try await APIService.shared.getDrivers()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

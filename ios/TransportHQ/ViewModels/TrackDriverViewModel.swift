import Foundation
import Combine
import MapKit

@MainActor
final class TrackDriverViewModel: ObservableObject {
    @Published var driverLocation: DriverLocation?
    @Published var mapRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
        span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
    )
    @Published var isConnected = false
    @Published var rideRequest: RideRequest?
    @Published var trip: Trip?

    private let driverId: String
    private let rideRequestId: String?
    private var cancellables = Set<AnyCancellable>()

    var driverName: String {
        if let name = driverLocation?.driverName, !name.isEmpty { return name }
        if let driver = rideRequest?.driver { return driver.fullName }
        return "Driver"
    }

    var driverSpeed: String {
        guard let speed = driverLocation?.speed, speed > 0 else { return "Stationary" }
        return String(format: "%.0f km/h", speed)
    }

    var driverPhone: String? {
        rideRequest?.driver?.phone
    }

    var etaText: String? {
        rideRequest?.eta
    }

    init(driverId: String, rideRequestId: String? = nil) {
        self.driverId = driverId
        self.rideRequestId = rideRequestId

        SocketService.shared.driverLocationSubject
            .receive(on: DispatchQueue.main)
            .filter { $0.id == driverId }
            .sink { [weak self] location in
                self?.driverLocation = location
                self?.isConnected = true
                self?.mapRegion = MKCoordinateRegion(
                    center: CLLocationCoordinate2D(latitude: location.lat, longitude: location.lng),
                    span: MKCoordinateSpan(latitudeDelta: 0.008, longitudeDelta: 0.008)
                )
            }
            .store(in: &cancellables)

        SocketService.shared.$isConnected
            .receive(on: DispatchQueue.main)
            .assign(to: &$isConnected)
    }

    func startTracking() {
        SocketService.shared.trackDriver(driverId: driverId)
        if let existingLocation = SocketService.shared.driverLocations[driverId] {
            driverLocation = existingLocation
            mapRegion = MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: existingLocation.lat, longitude: existingLocation.lng),
                span: MKCoordinateSpan(latitudeDelta: 0.008, longitudeDelta: 0.008)
            )
        }
    }

    func stopTracking() {
        SocketService.shared.untrackDriver(driverId: driverId)
    }

    func loadRideRequest() async {
        guard let id = rideRequestId else { return }
        do {
            rideRequest = try await APIService.shared.getRideRequest(id: id)
        } catch {
            print("Failed to load ride request: \(error)")
        }
    }

    func callDriver() {
        guard let phone = driverPhone,
              let url = URL(string: "tel://\(phone)") else { return }
        UIApplication.shared.open(url)
    }
}

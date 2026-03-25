import Foundation
import Combine
import MapKit

@MainActor
final class LiveMapViewModel: ObservableObject {
    @Published var driverLocations: [String: DriverLocation] = [:]
    @Published var trips: [Trip] = []
    @Published var rideRequests: [RideRequest] = []
    @Published var isLoading = false
    @Published var selectedDriverId: String?
    @Published var mapRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
        span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
    )

    private var cancellables = Set<AnyCancellable>()

    var activeDriverCount: Int { driverLocations.count }

    var activeTripsCount: Int {
        trips.filter { $0.status.isActive || $0.status == .assigned }.count
    }

    var driverList: [DriverLocation] {
        Array(driverLocations.values).sorted { $0.driverName < $1.driverName }
    }

    init() {
        SocketService.shared.driverLocationSubject
            .receive(on: DispatchQueue.main)
            .sink { [weak self] location in
                self?.driverLocations[location.id] = location
            }
            .store(in: &cancellables)

        SocketService.shared.$driverLocations
            .receive(on: DispatchQueue.main)
            .sink { [weak self] locations in
                self?.driverLocations = locations
            }
            .store(in: &cancellables)
    }

    func loadData() async {
        isLoading = true
        do {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            let today = formatter.string(from: Date())
            async let tripsResult = APIService.shared.getTrips(date: today)
            async let ridesResult = APIService.shared.getRideRequests()
            trips = try await tripsResult
            rideRequests = try await ridesResult
        } catch {
            print("LiveMap load error: \(error)")
        }
        isLoading = false
    }

    func centerOnDriver(_ driverId: String) {
        guard let location = driverLocations[driverId] else { return }
        mapRegion = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: location.lat, longitude: location.lng),
            span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
        )
        selectedDriverId = driverId
    }
}

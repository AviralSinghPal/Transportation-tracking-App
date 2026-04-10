import SwiftUI
import MapKit
#if canImport(UIKit)
import UIKit
#endif

struct DriverMapView: View {
    @StateObject private var viewModel = DriverMapViewModel()

    var body: some View {
        NavigationStack {
            ZStack {
                DriverMapRepresentable(
                    driverLocation: viewModel.currentCoordinate,
                    pickupAnnotation: viewModel.pickupAnnotation,
                    dropoffAnnotation: viewModel.dropoffAnnotation,
                    region: $viewModel.mapRegion
                )
                .ignoresSafeArea(edges: .top)

                VStack {
                    // Speed & Heading HUD
                    HStack(spacing: 12) {
                        MapStatPill(
                            icon: "speedometer",
                            text: String(format: "%.0f km/h", viewModel.speed),
                            color: Theme.primary
                        )
                        MapStatPill(
                            icon: "location.north.fill",
                            text: String(format: "%.0f\u{00B0}", viewModel.heading),
                            color: Theme.blue
                        )
                        Spacer()
                        Button {
                            viewModel.centerOnSelf()
                        } label: {
                            Image(systemName: "location.fill")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(Theme.primary)
                                .frame(width: 36, height: 36)
                                .background(Color.white)
                                .cornerRadius(18)
                                .shadow(color: Theme.shadowColor, radius: 4, x: 0, y: 2)
                        }
                    }
                    .padding()
                    .padding(.top, 48)

                    Spacer()

                    // Active trip info + Navigate button
                    if let trip = viewModel.activeTrip {
                        VStack(spacing: 12) {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Active Trip")
                                        .font(Theme.subheadlineFont)
                                        .foregroundColor(Theme.gray900)
                                    if let passenger = trip.rideRequest?.passenger {
                                        Text("Passenger: \(passenger.fullName)")
                                            .font(Theme.captionFont)
                                            .foregroundColor(Theme.gray500)
                                    }
                                }
                                Spacer()
                                StatusBadge(tripStatus: trip.status)
                            }

                            // Navigate buttons
                            HStack(spacing: 8) {
                                let pickupAddr = trip.displayPickup == "N/A" ? nil : trip.displayPickup
                                let dropoffAddr = trip.displayDropoff == "N/A" ? nil : trip.displayDropoff

                                if let addr = pickupAddr, !addr.isEmpty,
                                   trip.status == .assigned || trip.status == .driverDeparted {
                                    Button {
                                        openInMaps(address: addr)
                                    } label: {
                                        Label("Pickup", systemImage: "arrow.triangle.turn.up.right.circle.fill")
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundColor(.white)
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 10)
                                            .background(Theme.green)
                                            .cornerRadius(Theme.cornerRadiusSmall)
                                    }
                                }

                                if let addr = dropoffAddr, !addr.isEmpty,
                                   trip.status == .arrivedPickup || trip.status == .inProgress {
                                    Button {
                                        openInMaps(address: addr)
                                    } label: {
                                        Label("Dropoff", systemImage: "arrow.triangle.turn.up.right.circle.fill")
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundColor(.white)
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 10)
                                            .background(Theme.red)
                                            .cornerRadius(Theme.cornerRadiusSmall)
                                    }
                                }
                            }
                        }
                        .padding()
                        .background(Color.white)
                        .cornerRadius(Theme.cornerRadius, corners: [.topLeft, .topRight])
                        .shadow(color: Color.black.opacity(0.15), radius: 16, x: 0, y: -4)
                    } else {
                        // Connection status pill
                        HStack(spacing: 6) {
                            PulsingDot(color: viewModel.isLocationSharing ? Theme.green : Theme.gray400)
                            Text(viewModel.isLocationSharing ? "GPS Active" : "GPS Inactive")
                                .font(Theme.smallFont)
                                .foregroundColor(Theme.gray600)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.white.opacity(0.95))
                        .cornerRadius(16)
                        .padding(.bottom, 8)
                    }
                }
            }
            .task {
                await viewModel.loadTrips()
            }
        }
    }

    private func openInMaps(address: String) {
        guard let encoded = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "http://maps.apple.com/?daddr=\(encoded)") else { return }
        UIApplication.shared.open(url)
    }
}

// MARK: - ViewModel

@MainActor
final class DriverMapViewModel: ObservableObject {
    @Published var trips: [Trip] = []
    @Published var mapRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
        span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
    )
    @Published var speed: Double = 0
    @Published var heading: Double = 0
    @Published var isLocationSharing = false

    private let locationService = LocationService.shared

    var currentCoordinate: CLLocationCoordinate2D? {
        guard let loc = locationService.currentLocation else { return nil }
        return loc.coordinate
    }

    var activeTrip: Trip? {
        trips.first { $0.status.isActive || $0.status == .assigned }
    }

    // Pickup/dropoff map markers only appear when the server provides coordinate data.
    // The passengers array contains address strings without coordinates.
    var pickupAnnotation: MapAnnotationItem? {
        guard let trip = activeTrip,
              let coords = trip.pickupLocation?.coordinates ?? trip.rideRequest?.pickupLocation?.coordinates,
              let lat = coords.lat, let lng = coords.lng else { return nil }
        return MapAnnotationItem(coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng), label: "Pickup", color: .green)
    }

    var dropoffAnnotation: MapAnnotationItem? {
        guard let trip = activeTrip,
              let coords = trip.dropoffLocation?.coordinates ?? trip.rideRequest?.dropoffLocation?.coordinates,
              let lat = coords.lat, let lng = coords.lng else { return nil }
        return MapAnnotationItem(coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng), label: "Dropoff", color: .red)
    }

    init() {
        locationService.startTracking()
        isLocationSharing = locationService.isSharing

        // Update speed/heading from location updates
        Task { @MainActor [weak self] in
            for await location in locationService.locationSubject.values {
                self?.speed = max(0, location.speed * 3.6)
                self?.heading = max(0, location.course)
                self?.isLocationSharing = locationService.isSharing
            }
        }
    }

    func loadTrips() async {
        do {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            trips = try await APIService.shared.getTrips(date: formatter.string(from: Date()))
            centerOnSelf()
        } catch {
            print("DriverMap load error: \(error)")
        }
    }

    func centerOnSelf() {
        guard let loc = locationService.currentLocation else { return }
        mapRegion = MKCoordinateRegion(
            center: loc.coordinate,
            span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
        )
    }
}

// MARK: - Map Annotation Model

struct MapAnnotationItem {
    let coordinate: CLLocationCoordinate2D
    let label: String
    let color: Color
}

// MARK: - MKMapView Representable for Driver

#if os(iOS)
struct DriverMapRepresentable: UIViewRepresentable {
    let driverLocation: CLLocationCoordinate2D?
    let pickupAnnotation: MapAnnotationItem?
    let dropoffAnnotation: MapAnnotationItem?
    @Binding var region: MKCoordinateRegion

    func makeUIView(context: Context) -> MKMapView {
        let mapView = MKMapView()
        mapView.delegate = context.coordinator
        mapView.showsUserLocation = true
        mapView.setRegion(region, animated: false)
        return mapView
    }

    func updateUIView(_ mapView: MKMapView, context: Context) {
        let existing = mapView.annotations.compactMap { $0 as? TripPointAnnotation }
        mapView.removeAnnotations(existing)

        if let pickup = pickupAnnotation {
            let ann = TripPointAnnotation(label: pickup.label)
            ann.coordinate = pickup.coordinate
            ann.title = pickup.label
            mapView.addAnnotation(ann)
        }

        if let dropoff = dropoffAnnotation {
            let ann = TripPointAnnotation(label: dropoff.label)
            ann.coordinate = dropoff.coordinate
            ann.title = dropoff.label
            mapView.addAnnotation(ann)
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    class Coordinator: NSObject, MKMapViewDelegate {
        func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            guard let tripAnnotation = annotation as? TripPointAnnotation else { return nil }
            let identifier = "TripPoint"
            var view = mapView.dequeueReusableAnnotationView(withIdentifier: identifier) as? MKMarkerAnnotationView
            if view == nil {
                view = MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: identifier)
                view?.canShowCallout = true
            } else {
                view?.annotation = annotation
            }
            view?.markerTintColor = tripAnnotation.label.contains("Pickup") ? .green : .red
            view?.glyphImage = UIImage(systemName: "mappin.circle.fill")
            view?.displayPriority = .required
            return view
        }
    }
}

class TripPointAnnotation: MKPointAnnotation {
    let label: String
    init(label: String) {
        self.label = label
        super.init()
    }
}
#else
// macOS fallback - simple Map view
struct DriverMapRepresentable: View {
    let driverLocation: CLLocationCoordinate2D?
    let pickupAnnotation: MapAnnotationItem?
    let dropoffAnnotation: MapAnnotationItem?
    @Binding var region: MKCoordinateRegion
    var body: some View {
        Map(coordinateRegion: $region, showsUserLocation: true)
    }
}
#endif

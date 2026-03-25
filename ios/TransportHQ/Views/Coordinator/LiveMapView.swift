import SwiftUI
import MapKit

struct LiveMapView: View {
    @StateObject private var viewModel = LiveMapViewModel()
    @State private var showDriverPanel = false

    var body: some View {
        NavigationStack {
            ZStack {
                // Map
                LiveMapRepresentable(
                    driverLocations: viewModel.driverLocations,
                    selectedDriverId: $viewModel.selectedDriverId,
                    region: $viewModel.mapRegion
                )
                .ignoresSafeArea(edges: .top)

                // Stats Overlay
                VStack {
                    HStack(spacing: 12) {
                        MapStatPill(icon: "car.fill", text: "\(viewModel.activeDriverCount) Drivers", color: Theme.green)
                        MapStatPill(icon: "road.lanes", text: "\(viewModel.activeTripsCount) Active", color: Theme.primary)
                        Spacer()
                        Button {
                            showDriverPanel.toggle()
                        } label: {
                            Image(systemName: "list.bullet")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(Theme.gray700)
                                .frame(width: 36, height: 36)
                                .background(Color.white)
                                .cornerRadius(18)
                                .shadow(color: Theme.shadowColor, radius: 4, x: 0, y: 2)
                        }
                    }
                    .padding()
                    .padding(.top, 48)

                    Spacer()

                    // Connection status
                    HStack(spacing: 6) {
                        PulsingDot(color: SocketService.shared.isConnected ? Theme.green : Theme.red)
                        Text(SocketService.shared.isConnected ? "Live" : "Disconnected")
                            .font(Theme.smallFont)
                            .foregroundColor(Theme.gray600)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.white.opacity(0.95))
                    .cornerRadius(16)
                    .padding(.bottom, 8)
                }

                // Driver Panel
                if showDriverPanel {
                    DriverListPanel(
                        drivers: viewModel.driverList,
                        onSelect: { driverId in
                            viewModel.centerOnDriver(driverId)
                            showDriverPanel = false
                        },
                        onClose: { showDriverPanel = false }
                    )
                }
            }
            .task {
                await viewModel.loadData()
            }
        }
    }
}

struct MapStatPill: View {
    let icon: String
    let text: String
    let color: Color

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(color)
            Text(text)
                .font(Theme.smallFont)
                .foregroundColor(Theme.gray700)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.95))
        .cornerRadius(16)
        .shadow(color: Theme.shadowColor, radius: 4, x: 0, y: 2)
    }
}

struct DriverListPanel: View {
    let drivers: [DriverLocation]
    let onSelect: (String) -> Void
    let onClose: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Spacer()
            VStack(spacing: 0) {
                HStack {
                    Text("Active Drivers")
                        .font(Theme.headlineFont)
                        .foregroundColor(Theme.gray900)
                    Spacer()
                    Button(action: onClose) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 24))
                            .foregroundColor(Theme.gray400)
                    }
                }
                .padding()

                if drivers.isEmpty {
                    VStack(spacing: 8) {
                        Image(systemName: "car.fill")
                            .font(.system(size: 32))
                            .foregroundColor(Theme.gray300)
                        Text("No active drivers")
                            .font(Theme.bodyFont)
                            .foregroundColor(Theme.gray500)
                    }
                    .padding(32)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 8) {
                            ForEach(drivers) { driver in
                                Button {
                                    onSelect(driver.id)
                                } label: {
                                    HStack(spacing: 12) {
                                        Circle()
                                            .fill(Theme.green)
                                            .frame(width: 10, height: 10)

                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(driver.driverName.isEmpty ? "Driver" : driver.driverName)
                                                .font(Theme.subheadlineFont)
                                                .foregroundColor(Theme.gray900)
                                            Text(String(format: "%.1f km/h", driver.speed))
                                                .font(Theme.captionFont)
                                                .foregroundColor(Theme.gray500)
                                        }

                                        Spacer()

                                        Image(systemName: "location.fill")
                                            .foregroundColor(Theme.primary)
                                            .font(.system(size: 14))
                                    }
                                    .padding(12)
                                    .background(Theme.gray50)
                                    .cornerRadius(Theme.cornerRadiusSmall)
                                }
                            }
                        }
                        .padding(.horizontal)
                        .padding(.bottom)
                    }
                    .frame(maxHeight: 300)
                }
            }
            .background(Color.white)
            .cornerRadius(Theme.cornerRadius, corners: [.topLeft, .topRight])
            .shadow(color: Color.black.opacity(0.15), radius: 16, x: 0, y: -4)
        }
        .transition(.move(edge: .bottom))
    }
}

// MARK: - MKMapView Representable
struct LiveMapRepresentable: UIViewRepresentable {
    let driverLocations: [String: DriverLocation]
    @Binding var selectedDriverId: String?
    @Binding var region: MKCoordinateRegion

    func makeUIView(context: Context) -> MKMapView {
        let mapView = MKMapView()
        mapView.delegate = context.coordinator
        mapView.showsUserLocation = true
        mapView.setRegion(region, animated: false)
        return mapView
    }

    func updateUIView(_ mapView: MKMapView, context: Context) {
        context.coordinator.updateAnnotations(on: mapView, locations: driverLocations)
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, MKMapViewDelegate {
        var parent: LiveMapRepresentable
        private var annotationViews: [String: MKAnnotationView] = [:]

        init(_ parent: LiveMapRepresentable) {
            self.parent = parent
        }

        func updateAnnotations(on mapView: MKMapView, locations: [String: DriverLocation]) {
            let existingAnnotations = mapView.annotations.compactMap { $0 as? DriverAnnotation }
            let existingIds = Set(existingAnnotations.map { $0.driverId })
            let newIds = Set(locations.keys)

            // Remove stale annotations
            let toRemove = existingAnnotations.filter { !newIds.contains($0.driverId) }
            mapView.removeAnnotations(toRemove)

            for (driverId, location) in locations {
                let coordinate = CLLocationCoordinate2D(latitude: location.lat, longitude: location.lng)

                if let existing = existingAnnotations.first(where: { $0.driverId == driverId }) {
                    // Animate to new position
                    UIView.animate(withDuration: 1.0, delay: 0, options: .curveEaseInOut) {
                        existing.coordinate = coordinate
                    }
                    existing.title = location.driverName.isEmpty ? "Driver" : location.driverName
                    existing.subtitle = String(format: "%.1f km/h", location.speed)
                } else {
                    // Add new annotation
                    let annotation = DriverAnnotation(
                        driverId: driverId,
                        coordinate: coordinate,
                        driverName: location.driverName
                    )
                    annotation.title = location.driverName.isEmpty ? "Driver" : location.driverName
                    annotation.subtitle = String(format: "%.1f km/h", location.speed)
                    mapView.addAnnotation(annotation)
                }
            }
        }

        func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            guard let driverAnnotation = annotation as? DriverAnnotation else { return nil }

            let identifier = "DriverPin"
            var annotationView = mapView.dequeueReusableAnnotationView(withIdentifier: identifier) as? MKMarkerAnnotationView

            if annotationView == nil {
                annotationView = MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: identifier)
                annotationView?.canShowCallout = true
                annotationView?.animatesWhenAdded = true
            } else {
                annotationView?.annotation = annotation
            }

            annotationView?.markerTintColor = UIColor(Theme.primary)
            annotationView?.glyphImage = UIImage(systemName: "car.fill")
            annotationView?.displayPriority = .required

            return annotationView
        }

        func mapView(_ mapView: MKMapView, didSelect annotation: MKAnnotation) {
            if let driverAnnotation = annotation as? DriverAnnotation {
                parent.selectedDriverId = driverAnnotation.driverId
            }
        }
    }
}

class DriverAnnotation: NSObject, MKAnnotation {
    let driverId: String
    dynamic var coordinate: CLLocationCoordinate2D
    var title: String?
    var subtitle: String?

    init(driverId: String, coordinate: CLLocationCoordinate2D, driverName: String) {
        self.driverId = driverId
        self.coordinate = coordinate
        self.title = driverName
    }
}

// MARK: - Corner Radius Extension
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCornerShape(radius: radius, corners: corners))
    }
}

struct RoundedCornerShape: Shape {
    var radius: CGFloat
    var corners: UIRectCorner

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

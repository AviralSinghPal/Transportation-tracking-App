import SwiftUI
import MapKit

struct TrackDriverView: View {
    @StateObject private var viewModel: TrackDriverViewModel
    @Environment(\.dismiss) private var dismiss

    init(driverId: String, rideRequestId: String?) {
        _viewModel = StateObject(wrappedValue: TrackDriverViewModel(driverId: driverId, rideRequestId: rideRequestId))
    }

    var body: some View {
        ZStack {
            // Full-screen map
            TrackingMapRepresentable(
                driverLocation: viewModel.driverLocation,
                region: $viewModel.mapRegion
            )
            .ignoresSafeArea()

            VStack {
                // Top bar
                HStack {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(Theme.gray700)
                            .frame(width: 40, height: 40)
                            .background(Color.white)
                            .cornerRadius(20)
                            .shadow(color: Theme.shadowColor, radius: 4, x: 0, y: 2)
                    }

                    Spacer()

                    // Live indicator
                    HStack(spacing: 6) {
                        PulsingDot(color: viewModel.driverLocation != nil ? Theme.green : Theme.orange)
                        Text(viewModel.driverLocation != nil ? "Live Tracking" : "Connecting...")
                            .font(Theme.smallFont)
                            .foregroundColor(viewModel.driverLocation != nil ? Theme.green : Theme.orange)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.white.opacity(0.95))
                    .cornerRadius(16)
                    .shadow(color: Theme.shadowColor, radius: 4, x: 0, y: 2)

                    Spacer()

                    // Recenter button
                    Button {
                        if let loc = viewModel.driverLocation {
                            viewModel.mapRegion = MKCoordinateRegion(
                                center: CLLocationCoordinate2D(latitude: loc.lat, longitude: loc.lng),
                                span: MKCoordinateSpan(latitudeDelta: 0.008, longitudeDelta: 0.008)
                            )
                        }
                    } label: {
                        Image(systemName: "location.fill")
                            .font(.system(size: 16))
                            .foregroundColor(Theme.primary)
                            .frame(width: 40, height: 40)
                            .background(Color.white)
                            .cornerRadius(20)
                            .shadow(color: Theme.shadowColor, radius: 4, x: 0, y: 2)
                    }
                }
                .padding()
                .padding(.top, 4)

                Spacer()

                // Bottom Driver Info Panel
                VStack(spacing: 16) {
                    // Handle
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Theme.gray300)
                        .frame(width: 40, height: 5)
                        .padding(.top, 8)

                    HStack(spacing: 14) {
                        // Driver avatar
                        Circle()
                            .fill(Theme.primary.opacity(0.1))
                            .frame(width: 50, height: 50)
                            .overlay(
                                Image(systemName: "person.fill")
                                    .foregroundColor(Theme.primary)
                                    .font(.system(size: 22))
                            )

                        VStack(alignment: .leading, spacing: 4) {
                            Text(viewModel.driverName)
                                .font(Theme.subheadlineFont)
                                .foregroundColor(Theme.gray900)
                            Text(viewModel.driverSpeed)
                                .font(Theme.captionFont)
                                .foregroundColor(Theme.gray500)
                        }

                        Spacer()

                        if let _ = viewModel.driverPhone {
                            Button {
                                viewModel.callDriver()
                            } label: {
                                Image(systemName: "phone.fill")
                                    .font(.system(size: 18))
                                    .foregroundColor(.white)
                                    .frame(width: 44, height: 44)
                                    .background(Theme.green)
                                    .cornerRadius(22)
                            }
                        }
                    }

                    if let eta = viewModel.etaText {
                        HStack {
                            Image(systemName: "clock.fill")
                                .foregroundColor(Theme.primary)
                                .font(.system(size: 14))
                            Text("ETA: \(eta)")
                                .font(Theme.captionFont)
                                .foregroundColor(Theme.gray600)
                            Spacer()
                        }
                    }

                    if let ride = viewModel.rideRequest {
                        VStack(spacing: 8) {
                            HStack(spacing: 4) {
                                Image(systemName: "mappin.circle.fill")
                                    .foregroundColor(Theme.green)
                                    .font(.system(size: 14))
                                Text(ride.pickupLocation?.address ?? "Pickup")
                                    .font(Theme.captionFont)
                                    .foregroundColor(Theme.gray600)
                                    .lineLimit(1)
                                Spacer()
                            }
                            HStack(spacing: 4) {
                                Image(systemName: "mappin.circle.fill")
                                    .foregroundColor(Theme.red)
                                    .font(.system(size: 14))
                                Text(ride.dropoffLocation?.address ?? "Dropoff")
                                    .font(Theme.captionFont)
                                    .foregroundColor(Theme.gray600)
                                    .lineLimit(1)
                                Spacer()
                            }
                        }
                    }

                    if let loc = viewModel.driverLocation {
                        HStack {
                            Image(systemName: "location.fill")
                                .foregroundColor(Theme.gray400)
                                .font(.system(size: 12))
                            Text(String(format: "%.6f, %.6f", loc.lat, loc.lng))
                                .font(Theme.smallFont)
                                .foregroundColor(Theme.gray400)
                            Spacer()
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
                .background(
                    Color.white
                        .cornerRadius(Theme.cornerRadius, corners: [.topLeft, .topRight])
                        .shadow(color: Color.black.opacity(0.15), radius: 16, x: 0, y: -4)
                )
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            viewModel.startTracking()
            Task { await viewModel.loadRideRequest() }
        }
        .onDisappear {
            viewModel.stopTracking()
        }
    }
}

// MARK: - Tracking Map
struct TrackingMapRepresentable: UIViewRepresentable {
    let driverLocation: DriverLocation?
    @Binding var region: MKCoordinateRegion

    func makeUIView(context: Context) -> MKMapView {
        let mapView = MKMapView()
        mapView.delegate = context.coordinator
        mapView.showsUserLocation = true
        mapView.setRegion(region, animated: false)
        return mapView
    }

    func updateUIView(_ mapView: MKMapView, context: Context) {
        context.coordinator.updateDriverPin(on: mapView, location: driverLocation)

        if let loc = driverLocation {
            let coordinate = CLLocationCoordinate2D(latitude: loc.lat, longitude: loc.lng)
            let newRegion = MKCoordinateRegion(
                center: coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.008, longitudeDelta: 0.008)
            )
            mapView.setRegion(newRegion, animated: true)
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    class Coordinator: NSObject, MKMapViewDelegate {
        private var driverAnnotation: MKPointAnnotation?

        func updateDriverPin(on mapView: MKMapView, location: DriverLocation?) {
            guard let location = location else { return }

            let coordinate = CLLocationCoordinate2D(latitude: location.lat, longitude: location.lng)

            if let existing = driverAnnotation {
                UIView.animate(withDuration: 1.0, delay: 0, options: .curveEaseInOut) {
                    existing.coordinate = coordinate
                }
                existing.title = location.driverName.isEmpty ? "Driver" : location.driverName
                existing.subtitle = String(format: "%.1f km/h", location.speed)
            } else {
                let annotation = MKPointAnnotation()
                annotation.coordinate = coordinate
                annotation.title = location.driverName.isEmpty ? "Driver" : location.driverName
                annotation.subtitle = String(format: "%.1f km/h", location.speed)
                mapView.addAnnotation(annotation)
                driverAnnotation = annotation
            }
        }

        func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            guard !(annotation is MKUserLocation) else { return nil }

            let identifier = "TrackingPin"
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
    }
}

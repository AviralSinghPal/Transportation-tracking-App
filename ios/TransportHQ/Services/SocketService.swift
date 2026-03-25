import Foundation
import SocketIO
import Combine

final class SocketService: ObservableObject {
    static let shared = SocketService()

    private var manager: SocketManager?
    private var socket: SocketIOClient?

    @Published var isConnected = false
    @Published var driverLocations: [String: DriverLocation] = [:]
    @Published var lastNotification: AppNotification?
    @Published var lastRideRequestUpdate: String?

    let driverLocationSubject = PassthroughSubject<DriverLocation, Never>()
    let rideRequestNewSubject = PassthroughSubject<Void, Never>()
    let rideRequestUpdatedSubject = PassthroughSubject<String, Never>()
    let notificationSubject = PassthroughSubject<AppNotification, Never>()

    private init() {}

    func connect(token: String) {
        disconnect()

        let url = URL(string: "http://localhost:5001")!
        manager = SocketManager(socketURL: url, config: [
            .log(false),
            .compress,
            .connectParams(["token": token]),
            .forceWebsockets(true),
            .reconnects(true),
            .reconnectWait(3)
        ])

        socket = manager?.defaultSocket

        setupListeners()
        socket?.connect()
    }

    func disconnect() {
        socket?.disconnect()
        socket?.removeAllHandlers()
        manager = nil
        socket = nil
        isConnected = false
    }

    private func setupListeners() {
        socket?.on(clientEvent: .connect) { [weak self] _, _ in
            DispatchQueue.main.async {
                self?.isConnected = true
            }
            print("[Socket] Connected")
        }

        socket?.on(clientEvent: .disconnect) { [weak self] _, _ in
            DispatchQueue.main.async {
                self?.isConnected = false
            }
            print("[Socket] Disconnected")
        }

        socket?.on(clientEvent: .error) { _, args in
            print("[Socket] Error: \(args)")
        }

        socket?.on("driver:location-update") { [weak self] data, _ in
            guard let dict = data.first as? [String: Any],
                  let driverId = dict["driverId"] as? String,
                  let lat = dict["lat"] as? Double,
                  let lng = dict["lng"] as? Double else { return }

            let speed = dict["speed"] as? Double ?? 0
            let heading = dict["heading"] as? Double ?? 0
            let driverName = dict["driverName"] as? String ?? ""

            let location = DriverLocation(
                id: driverId,
                lat: lat,
                lng: lng,
                speed: speed,
                heading: heading,
                driverName: driverName,
                updatedAt: Date()
            )

            DispatchQueue.main.async {
                self?.driverLocations[driverId] = location
                self?.driverLocationSubject.send(location)
            }
        }

        socket?.on("driver:location") { [weak self] data, _ in
            guard let dict = data.first as? [String: Any],
                  let driverId = dict["driverId"] as? String,
                  let lat = dict["lat"] as? Double,
                  let lng = dict["lng"] as? Double else { return }

            let speed = dict["speed"] as? Double ?? 0
            let heading = dict["heading"] as? Double ?? 0
            let driverName = dict["driverName"] as? String ?? ""

            let location = DriverLocation(
                id: driverId,
                lat: lat,
                lng: lng,
                speed: speed,
                heading: heading,
                driverName: driverName,
                updatedAt: Date()
            )

            DispatchQueue.main.async {
                self?.driverLocations[driverId] = location
                self?.driverLocationSubject.send(location)
            }
        }

        socket?.on("rideRequest:new") { [weak self] _, _ in
            DispatchQueue.main.async {
                self?.rideRequestNewSubject.send()
            }
        }

        socket?.on("rideRequest:updated") { [weak self] data, _ in
            if let dict = data.first as? [String: Any],
               let id = dict["_id"] as? String ?? dict["id"] as? String {
                DispatchQueue.main.async {
                    self?.lastRideRequestUpdate = id
                    self?.rideRequestUpdatedSubject.send(id)
                }
            }
        }

        socket?.on("notification:new") { [weak self] data, _ in
            if let dict = data.first as? [String: Any],
               let jsonData = try? JSONSerialization.data(withJSONObject: dict),
               let notification = try? JSONDecoder().decode(AppNotification.self, from: jsonData) {
                DispatchQueue.main.async {
                    self?.lastNotification = notification
                    self?.notificationSubject.send(notification)
                }
            }
        }
    }

    // MARK: - Emit Events
    func emitDriverLocation(lat: Double, lng: Double, speed: Double, heading: Double) {
        socket?.emit("driver:location", [
            "lat": lat,
            "lng": lng,
            "speed": speed,
            "heading": heading
        ])
    }

    func trackDriver(driverId: String) {
        socket?.emit("track:driver", ["driverId": driverId])
    }

    func untrackDriver(driverId: String) {
        socket?.emit("untrack:driver", ["driverId": driverId])
    }
}

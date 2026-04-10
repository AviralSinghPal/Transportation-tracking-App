import Foundation

struct AppNotification: Codable, Identifiable {
    let id: String
    let type: String?
    let title: String?
    let message: String?
    let data: NotificationData?
    let read: Bool?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case type, title, message, data, read, createdAt
    }
}

struct NotificationData: Codable {
    let rideRequestId: String?
    let tripId: String?
    let driverId: String?
}

struct UnreadCountResponse: Codable {
    let count: Int
}

struct DriverLocation: Identifiable {
    let id: String
    var lat: Double
    var lng: Double
    var speed: Double
    var heading: Double
    var driverName: String
    var updatedAt: Date

    init(id: String, lat: Double, lng: Double, speed: Double = 0, heading: Double = 0, driverName: String = "", updatedAt: Date = Date()) {
        self.id = id
        self.lat = lat
        self.lng = lng
        self.speed = speed
        self.heading = heading
        self.driverName = driverName
        self.updatedAt = updatedAt
    }
}

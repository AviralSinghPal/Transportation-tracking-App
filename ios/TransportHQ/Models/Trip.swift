import Foundation

struct Trip: Codable, Identifiable {
    let id: String
    let rideRequest: TripRideRequest?
    let driver: TripDriver?
    let vehicle: TripVehicle?
    let status: TripStatus
    let pickupLocation: TripLocation?
    let dropoffLocation: TripLocation?
    let scheduledTime: String?
    let startTime: String?
    let endTime: String?
    let eta: String?
    let currentLocation: GeoPoint?
    let distance: Double?
    let duration: Double?
    let createdAt: String?
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case rideRequest, driver, vehicle, status
        case pickupLocation, dropoffLocation
        case scheduledTime, startTime, endTime, eta
        case currentLocation, distance, duration
        case createdAt, updatedAt
    }
}

struct TripRideRequest: Codable {
    let id: String?
    let passenger: TripPassenger?
    let pickupLocation: TripLocation?
    let dropoffLocation: TripLocation?
    let priority: String?
    let department: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case passenger, pickupLocation, dropoffLocation, priority, department, notes
    }
}

struct TripPassenger: Codable {
    let id: String?
    let firstName: String?
    let lastName: String?
    let phone: String?
    let email: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case firstName, lastName, phone, email
    }

    var fullName: String {
        "\(firstName ?? "") \(lastName ?? "")".trimmingCharacters(in: .whitespaces)
    }
}

struct TripDriver: Codable {
    let id: String?
    let firstName: String?
    let lastName: String?
    let phone: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case firstName, lastName, phone
    }

    var fullName: String {
        "\(firstName ?? "") \(lastName ?? "")".trimmingCharacters(in: .whitespaces)
    }
}

struct TripVehicle: Codable {
    let id: String?
    let make: String?
    let model: String?
    let year: Int?
    let licensePlate: String?
    let type: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case make, model, year, licensePlate, type
    }

    var displayName: String {
        "\(make ?? "") \(model ?? "") (\(licensePlate ?? ""))".trimmingCharacters(in: .whitespaces)
    }
}

struct TripLocation: Codable {
    let address: String?
    let coordinates: GeoPoint?
}

struct GeoPoint: Codable {
    let lat: Double?
    let lng: Double?

    enum CodingKeys: String, CodingKey {
        case lat, lng
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        lat = try? container.decodeIfPresent(Double.self, forKey: .lat)
        lng = try? container.decodeIfPresent(Double.self, forKey: .lng)
    }

    init(lat: Double, lng: Double) {
        self.lat = lat
        self.lng = lng
    }
}

enum TripStatus: String, Codable {
    case assigned
    case driverDeparted = "driver-departed"
    case arrivedPickup = "arrived-pickup"
    case inProgress = "in-progress"
    case completed
    case cancelled

    var displayName: String {
        switch self {
        case .assigned: return "Assigned"
        case .driverDeparted: return "Driver Departed"
        case .arrivedPickup: return "Arrived at Pickup"
        case .inProgress: return "In Progress"
        case .completed: return "Completed"
        case .cancelled: return "Cancelled"
        }
    }

    var nextStatus: TripStatus? {
        switch self {
        case .assigned: return .driverDeparted
        case .driverDeparted: return .arrivedPickup
        case .arrivedPickup: return .inProgress
        case .inProgress: return .completed
        case .completed, .cancelled: return nil
        }
    }

    var nextStatusLabel: String? {
        switch self {
        case .assigned: return "Depart for Pickup"
        case .driverDeparted: return "Arrived at Pickup"
        case .arrivedPickup: return "Start Trip"
        case .inProgress: return "Complete Trip"
        case .completed, .cancelled: return nil
        }
    }

    var isActive: Bool {
        switch self {
        case .driverDeparted, .arrivedPickup, .inProgress:
            return true
        default:
            return false
        }
    }
}

import Foundation

struct Trip: Codable, Identifiable {
    let id: String
    let rideRequest: TripRideRequest?
    let driver: TripDriver?
    let vehicle: TripVehicle?
    let status: TripStatus
    let pickupLocation: TripLocation?
    let dropoffLocation: TripLocation?
    let passengers: [TripPassengerStop]?
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
        case pickupLocation, dropoffLocation, passengers
        case scheduledTime, startTime, endTime, eta
        case currentLocation, distance, duration
        case createdAt, updatedAt
    }

    var displayPickup: String {
        pickupLocation?.address
            ?? rideRequest?.pickupLocation?.address
            ?? passengers?.first?.pickupAddress
            ?? "N/A"
    }

    var displayDropoff: String {
        dropoffLocation?.address
            ?? rideRequest?.dropoffLocation?.address
            ?? passengers?.first?.dropoffAddress
            ?? "N/A"
    }
}

struct TripPassengerStop: Codable {
    let id: String?
    let name: String?
    let phone: String?
    let pickupAddress: String?
    let dropoffAddress: String?
    let pickupTime: String?
    let dropoffTime: String?
    let status: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, phone, pickupAddress, dropoffAddress
        case pickupTime, dropoffTime, status
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
    let name: String?
    let firstName: String?
    let lastName: String?
    let phone: String?
    let email: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, firstName, lastName, phone, email
    }

    var fullName: String {
        if let name = name, !name.isEmpty { return name }
        return "\(firstName ?? "") \(lastName ?? "")".trimmingCharacters(in: .whitespaces)
    }
}

struct TripDriver: Codable {
    let id: String?
    let name: String?
    let firstName: String?
    let lastName: String?
    let phone: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, firstName, lastName, phone
    }

    var fullName: String {
        if let name = name, !name.isEmpty { return name }
        return "\(firstName ?? "") \(lastName ?? "")".trimmingCharacters(in: .whitespaces)
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
    case unassigned
    case assigned
    case driverDeparted = "driver-departed"
    case arrivedPickup = "arrived-pickup"
    case inProgress = "in-progress"
    case completed
    case cancelled

    var displayName: String {
        switch self {
        case .unassigned: return "Unassigned"
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
        case .unassigned: return nil
        case .assigned: return .driverDeparted
        case .driverDeparted: return .arrivedPickup
        case .arrivedPickup: return .inProgress
        case .inProgress: return .completed
        case .completed, .cancelled: return nil
        }
    }

    var nextStatusLabel: String? {
        switch self {
        case .unassigned: return nil
        case .assigned: return "I'm Departing Now"
        case .driverDeparted: return "I've Arrived at Pickup"
        case .arrivedPickup: return "Passenger Picked Up"
        case .inProgress: return "Arrived at Destination"
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

struct TripDetailResponse: Codable {
    let trip: Trip
    let events: [TripEvent]?
}

struct TripResponse: Codable {
    let trip: Trip
}

struct TripEvent: Codable, Identifiable {
    let id: String
    let trip: String?
    let type: String?
    let actor: TripEventActor?
    let details: String?
    let timestamp: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case trip, type, actor, details, timestamp, createdAt
    }
}

struct TripEventActor: Codable {
    let id: String?
    let name: String?
    let role: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, role
    }
}

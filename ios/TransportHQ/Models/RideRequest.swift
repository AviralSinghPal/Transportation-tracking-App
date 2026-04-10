import Foundation

struct RideRequest: Codable, Identifiable {
    let id: String
    let passenger: TripPassenger?
    let requester: TripPassenger?
    let pickupLocation: FlexLocation?
    let dropoffLocation: FlexLocation?
    let pickupTime: String?
    let passengerCount: Int?
    let priority: RidePriority?
    let status: RideRequestStatus?
    let department: String?
    let notes: String?
    let driver: TripDriver?
    let vehicle: TripVehicle?
    let assignedDriver: TripDriver?
    let assignedVehicle: TripVehicle?
    let trip: String?
    let eta: String?
    let isPACall: Bool?
    let callType: String?
    let isSharedRide: Bool?
    let createdAt: String?
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case passenger, requester, pickupLocation, dropoffLocation, pickupTime
        case passengerCount, priority, status, department, notes
        case driver, vehicle, assignedDriver, assignedVehicle
        case trip, eta, isPACall, callType, isSharedRide, createdAt, updatedAt
    }

    var displayPassenger: TripPassenger? { passenger ?? requester }
    var displayDriver: TripDriver? { driver ?? assignedDriver }
    var displayVehicle: TripVehicle? { vehicle ?? assignedVehicle }
}

// Handles both String and Object location formats from API
struct FlexLocation: Codable {
    let address: String
    let coordinates: GeoPoint?

    init(from decoder: Decoder) throws {
        if let container = try? decoder.singleValueContainer(), let str = try? container.decode(String.self) {
            self.address = str
            self.coordinates = nil
        } else {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            self.address = (try? container.decode(String.self, forKey: .address)) ?? ""
            self.coordinates = try? container.decode(GeoPoint.self, forKey: .coordinates)
        }
    }

    enum CodingKeys: String, CodingKey {
        case address, coordinates
    }
}

enum RidePriority: String, Codable {
    case low, normal, high, urgent

    var displayName: String { rawValue.capitalized }
}

enum RideRequestStatus: String, Codable {
    case pending
    case approved
    case assigned
    case inProgress = "in-progress"
    case completed
    case cancelled
    case rejected

    var displayName: String {
        switch self {
        case .pending: return "Pending"
        case .approved: return "Approved"
        case .assigned: return "Assigned"
        case .inProgress: return "In Progress"
        case .completed: return "Completed"
        case .cancelled: return "Cancelled"
        case .rejected: return "Rejected"
        }
    }
}

struct CreateRideRequest: Codable {
    let pickupLocation: String
    let dropoffLocation: String
    let pickupTime: String
    let passengerCount: Int
    let priority: String
    let department: String
    let notes: String
}

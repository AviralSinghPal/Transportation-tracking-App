import Foundation

struct RideRequest: Codable, Identifiable {
    let id: String
    let passenger: TripPassenger?
    let pickupLocation: TripLocation?
    let dropoffLocation: TripLocation?
    let pickupTime: String?
    let passengerCount: Int?
    let priority: RidePriority?
    let status: RideRequestStatus?
    let department: String?
    let notes: String?
    let driver: TripDriver?
    let vehicle: TripVehicle?
    let trip: String?
    let eta: String?
    let createdAt: String?
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case passenger, pickupLocation, dropoffLocation, pickupTime
        case passengerCount, priority, status, department, notes
        case driver, vehicle, trip, eta, createdAt, updatedAt
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

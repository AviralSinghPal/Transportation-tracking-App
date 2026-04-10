import Foundation

struct PermanentTrip: Codable, Identifiable {
    let id: String
    let title: String?
    let pickupLocation: String?
    let dropoffLocation: String?
    let scheduledTime: String?
    let driver: PermanentTripDriver?
    let vehicle: PermanentTripVehicle?
    let passengers: [PermanentTripPassenger]?
    let startDate: String?
    let endDate: String?
    let activeDays: [String]?
    let status: String?
    let notes: String?
    let swapHistory: [SwapHistoryEntry]?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case title, pickupLocation, dropoffLocation, scheduledTime
        case driver, vehicle, passengers, startDate, endDate
        case activeDays, status, notes, swapHistory, createdAt
    }
}

struct PermanentTripDriver: Codable {
    let id: String?
    let name: String?
    let phone: String?
    enum CodingKeys: String, CodingKey { case id = "_id"; case name, phone }
}

struct PermanentTripVehicle: Codable {
    let id: String?
    let name: String?
    let licensePlate: String?
    let type: String?
    let capacity: Int?
    enum CodingKeys: String, CodingKey { case id = "_id"; case name, licensePlate, type, capacity }
}

struct PermanentTripPassenger: Codable, Identifiable {
    let id: String
    let name: String?
    let phone: String?
    enum CodingKeys: String, CodingKey { case id = "_id"; case name, phone }
}

struct SwapHistoryEntry: Codable {
    let type: String?
    let reason: String?
    let swappedAt: String?
}

struct PermanentTripResponse: Codable {
    let permanentTrip: PermanentTrip
}

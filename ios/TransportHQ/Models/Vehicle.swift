import Foundation

struct Vehicle: Codable, Identifiable {
    let id: String
    let make: String?
    let model: String?
    let year: Int?
    let licensePlate: String?
    let type: String?
    let capacity: Int?
    let status: VehicleStatus?
    let currentDriver: String?
    let mileage: Double?
    let fuelLevel: Double?
    let isActive: Bool?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case make, model, year, licensePlate, type, capacity
        case status, currentDriver, mileage, fuelLevel, isActive
    }

    var displayName: String {
        let parts = [make, model].compactMap { $0 }
        let name = parts.joined(separator: " ")
        if let plate = licensePlate {
            return "\(name) (\(plate))"
        }
        return name
    }
}

enum VehicleStatus: String, Codable {
    case available
    case inUse = "in-use"
    case maintenance
    case outOfService = "out-of-service"

    var displayName: String {
        switch self {
        case .available: return "Available"
        case .inUse: return "In Use"
        case .maintenance: return "Maintenance"
        case .outOfService: return "Out of Service"
        }
    }
}

struct Driver: Codable, Identifiable {
    let id: String
    let firstName: String?
    let lastName: String?
    let email: String?
    let phone: String?
    let role: String?
    let isActive: Bool?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case firstName, lastName, email, phone, role, isActive
    }

    var fullName: String {
        "\(firstName ?? "") \(lastName ?? "")".trimmingCharacters(in: .whitespaces)
    }
}

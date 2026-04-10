import Foundation

struct Vehicle: Codable, Identifiable {
    let id: String
    let name: String?
    let plateNumber: String?
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
    let color: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, plateNumber, make, model, year, licensePlate, type, capacity
        case status, currentDriver, mileage, fuelLevel, isActive, color
    }

    var displayName: String {
        if let name = name, !name.isEmpty {
            if let plate = plateNumber ?? licensePlate {
                return "\(name) (\(plate))"
            }
            return name
        }
        let parts = [make, model].compactMap { $0 }
        let result = parts.joined(separator: " ")
        if let plate = plateNumber ?? licensePlate {
            return "\(result) (\(plate))"
        }
        return result.isEmpty ? "Unknown Vehicle" : result
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
    let name: String?
    let firstName: String?
    let lastName: String?
    let email: String?
    let phone: String?
    let role: String?
    let isActive: Bool?
    let isAvailable: Bool?
    let isTemporary: Bool?
    let licenseNumber: String?
    let licenseExpiry: String?
    let isPermanentlyAllocated: Bool?
    let allocatedTo: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, firstName, lastName, email, phone, role, isActive
        case isAvailable, isTemporary, licenseNumber, licenseExpiry
        case isPermanentlyAllocated, allocatedTo
    }

    var fullName: String {
        if let name = name, !name.isEmpty { return name }
        return "\(firstName ?? "") \(lastName ?? "")".trimmingCharacters(in: .whitespaces)
    }

    var initials: String {
        let parts = fullName.split(separator: " ")
        return parts.prefix(2).compactMap { $0.first.map(String.init) }.joined()
    }
}

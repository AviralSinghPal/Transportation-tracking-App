import Foundation

struct TalentProfileData: Codable, Identifiable {
    let id: String
    let name: String?
    let phone: String?
    let email: String?
    let status: String?
    let isConfidential: Bool?
    let vehiclePreference: String?
    let musicPreference: String?
    let waterPreference: String?
    let snackPreference: String?
    let drinkPreference: String?
    let hotelName: String?
    let hotelAddress: String?
    let agentName: String?
    let agentPhone: String?
    let preferredDriver: TalentDriverRef?
    let totalTrips: Int?
    let totalCost: Double?
    let totalMiles: Double?
    let notes: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, phone, email, status, isConfidential
        case vehiclePreference, musicPreference, waterPreference, snackPreference, drinkPreference
        case hotelName, hotelAddress, agentName, agentPhone
        case preferredDriver, totalTrips, totalCost, totalMiles, notes, createdAt
    }

    var initials: String {
        let parts = (name ?? "").split(separator: " ")
        return parts.prefix(2).compactMap { $0.first.map(String.init) }.joined()
    }

    var preferences: [(String, String)] {
        var result: [(String, String)] = []
        if let v = vehiclePreference, !v.isEmpty { result.append(("car.fill", v)) }
        if let m = musicPreference, !m.isEmpty { result.append(("music.note", m)) }
        if let w = waterPreference, !w.isEmpty { result.append(("drop.fill", w)) }
        if let s = snackPreference, !s.isEmpty { result.append(("fork.knife", s)) }
        if let d = drinkPreference, !d.isEmpty { result.append(("cup.and.saucer.fill", d)) }
        return result
    }
}

struct TalentDriverRef: Codable {
    let id: String?
    let name: String?
    let phone: String?
    enum CodingKeys: String, CodingKey { case id = "_id"; case name, phone }
}

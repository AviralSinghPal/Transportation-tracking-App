import Foundation

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let firstName: String
    let lastName: String
    let role: UserRole
    let phone: String?
    let department: String?
    let avatar: String?
    let isActive: Bool?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case email, firstName, lastName, role, phone, department, avatar, isActive
    }

    var fullName: String {
        "\(firstName) \(lastName)"
    }

    var initials: String {
        let f = firstName.prefix(1).uppercased()
        let l = lastName.prefix(1).uppercased()
        return "\(f)\(l)"
    }
}

enum UserRole: String, Codable {
    case coordinator
    case driver
    case passenger
}

struct AuthResponse: Codable {
    let token: String
    let user: User
}

struct LoginRequest: Codable {
    let email: String
    let password: String
}

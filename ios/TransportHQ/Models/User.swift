import Foundation

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let role: UserRole
    let phone: String?
    let department: String?
    let avatar: String?
    let isActive: Bool?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case email, name, role, phone, department, avatar, isActive
    }

    var firstName: String {
        String(name.split(separator: " ").first ?? "")
    }

    var lastName: String {
        let parts = name.split(separator: " ")
        return parts.count > 1 ? parts.dropFirst().joined(separator: " ") : ""
    }

    var fullName: String { name }

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

    enum CodingKeys: String, CodingKey {
        case token = "accessToken"
        case user
    }
}

struct LoginRequest: Codable {
    let email: String
    let password: String
}

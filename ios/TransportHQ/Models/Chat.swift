import Foundation

struct Conversation: Codable, Identifiable {
    var id: String { user?.id ?? UUID().uuidString }
    let user: ChatContact?
    let lastMessage: String?
    let lastMessageAt: String?
    let unreadCount: Int?
}

struct ChatMessage: Codable, Identifiable {
    let id: String
    let sender: ChatMessageSender?
    let receiver: String?
    let message: String?
    let channel: String?
    let tripId: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case sender, receiver, message, channel, tripId, createdAt
    }
}

struct ChatMessageSender: Codable {
    let id: String?
    let name: String?
    let firstName: String?
    let lastName: String?
    let role: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, firstName, lastName, role
    }

    var displayName: String {
        if let name = name, !name.isEmpty { return name }
        return "\(firstName ?? "") \(lastName ?? "")".trimmingCharacters(in: .whitespaces)
    }
}

struct ChatContact: Codable, Identifiable {
    let id: String
    let name: String?
    let firstName: String?
    let lastName: String?
    let role: String?
    let phone: String?
    let email: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, firstName, lastName, role, phone, email
    }

    var displayName: String {
        if let name = name, !name.isEmpty { return name }
        return "\(firstName ?? "") \(lastName ?? "")".trimmingCharacters(in: .whitespaces)
    }

    var initials: String {
        let parts = displayName.split(separator: " ")
        return parts.prefix(2).compactMap { $0.first.map(String.init) }.joined()
    }
}

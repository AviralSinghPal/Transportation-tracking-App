import Foundation
import Combine

final class AuthService: ObservableObject {
    static let shared = AuthService()

    @Published var currentUser: User?
    @Published var isAuthenticated = false
    @Published var token: String? {
        didSet {
            if let token = token {
                UserDefaults.standard.set(token, forKey: "auth_token")
                APIService.shared.setToken(token)
            } else {
                UserDefaults.standard.removeObject(forKey: "auth_token")
                APIService.shared.setToken(nil)
            }
        }
    }

    private init() {
        if let savedToken = UserDefaults.standard.string(forKey: "auth_token") {
            self.token = savedToken
            APIService.shared.setToken(savedToken)
        }
        if let userData = UserDefaults.standard.data(forKey: "current_user"),
           let user = try? JSONDecoder().decode(User.self, from: userData) {
            self.currentUser = user
            self.isAuthenticated = true
        }
        // Check for auto-login trigger
        if !isAuthenticated, let role = UserDefaults.standard.string(forKey: "auto_login_role") {
            UserDefaults.standard.removeObject(forKey: "auto_login_role")
            Task { @MainActor in
                await self.autoLoginIfNeeded(role: role)
            }
        }
    }

    @MainActor
    func login(email: String, password: String) async throws {
        let response = try await APIService.shared.login(email: email, password: password)
        self.token = response.token
        self.currentUser = response.user
        self.isAuthenticated = true

        if let userData = try? JSONEncoder().encode(response.user) {
            UserDefaults.standard.set(userData, forKey: "current_user")
        }

        SocketService.shared.connect(token: response.token)
    }

    func logout() {
        token = nil
        currentUser = nil
        isAuthenticated = false
        UserDefaults.standard.removeObject(forKey: "current_user")
        SocketService.shared.disconnect()
        LocationService.shared.stopTracking()
    }

    func restoreSession() {
        if let token = token, isAuthenticated {
            SocketService.shared.connect(token: token)
        }
    }

    @MainActor
    func autoLoginIfNeeded(role: String? = nil) async {
        guard !isAuthenticated else { return }
        if let role = role {
            let email: String
            switch role {
            case "coordinator": email = "coordinator@test.com"
            case "driver": email = "driver1@test.com"
            case "actor", "passenger": email = "actor1@test.com"
            default: return
            }
            try? await login(email: email, password: "password123")
        }
    }
}

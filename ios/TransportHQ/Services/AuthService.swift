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
}

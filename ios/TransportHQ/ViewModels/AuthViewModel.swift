import Foundation
import SwiftUI

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let authService = AuthService.shared

    struct DemoAccount {
        let label: String
        let email: String
        let password: String
        let icon: String
        let color: Color
    }

    let demoAccounts: [DemoAccount] = [
        DemoAccount(label: "Coordinator", email: "coordinator@test.com", password: "password123", icon: "person.badge.shield.checkmark", color: Theme.primary),
        DemoAccount(label: "Driver", email: "driver1@test.com", password: "password123", icon: "car.fill", color: Theme.green),
        DemoAccount(label: "Passenger", email: "actor1@test.com", password: "password123", icon: "person.fill", color: Theme.blue)
    ]

    func login() async {
        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Please enter email and password"
            return
        }
        isLoading = true
        errorMessage = nil
        do {
            try await authService.login(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func demoLogin(account: DemoAccount) async {
        email = account.email
        password = account.password
        isLoading = true
        errorMessage = nil
        do {
            try await authService.login(email: account.email, password: account.password)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

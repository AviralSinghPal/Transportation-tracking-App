import SwiftUI

struct LoginView: View {
    @StateObject private var viewModel = AuthViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                // Header
                VStack(spacing: 12) {
                    Image(systemName: "bus.doubledecker.fill")
                        .font(.system(size: 56))
                        .foregroundColor(Theme.primary)
                        .padding(.top, 60)

                    Text("TransportHQ")
                        .font(Theme.titleFont)
                        .foregroundColor(Theme.gray900)

                    Text("Transportation Management System")
                        .font(Theme.captionFont)
                        .foregroundColor(Theme.gray500)
                }

                // Login Form
                VStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Email")
                            .font(Theme.captionFont)
                            .foregroundColor(Theme.gray600)
                        TextField("Enter your email", text: $viewModel.email)
                            .textFieldStyle(.plain)
                            .padding(12)
                            .background(Theme.gray50)
                            .cornerRadius(Theme.cornerRadiusSmall)
                            .overlay(
                                RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall)
                                    .stroke(Theme.gray200, lineWidth: 1)
                            )
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Password")
                            .font(Theme.captionFont)
                            .foregroundColor(Theme.gray600)
                        SecureField("Enter your password", text: $viewModel.password)
                            .textFieldStyle(.plain)
                            .padding(12)
                            .background(Theme.gray50)
                            .cornerRadius(Theme.cornerRadiusSmall)
                            .overlay(
                                RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall)
                                    .stroke(Theme.gray200, lineWidth: 1)
                            )
                    }

                    if let error = viewModel.errorMessage {
                        Text(error)
                            .font(Theme.captionFont)
                            .foregroundColor(Theme.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    Button {
                        Task { await viewModel.login() }
                    } label: {
                        if viewModel.isLoading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("Sign In")
                        }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(viewModel.isLoading)
                }
                .padding(.horizontal, 4)

                // Demo Accounts
                VStack(spacing: 12) {
                    HStack {
                        Rectangle()
                            .fill(Theme.gray200)
                            .frame(height: 1)
                        Text("Quick Demo Login")
                            .font(Theme.captionFont)
                            .foregroundColor(Theme.gray400)
                            .fixedSize()
                        Rectangle()
                            .fill(Theme.gray200)
                            .frame(height: 1)
                    }

                    ForEach(viewModel.demoAccounts, id: \.email) { account in
                        Button {
                            Task { await viewModel.demoLogin(account: account) }
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: account.icon)
                                    .font(.system(size: 18))
                                    .foregroundColor(account.color)
                                    .frame(width: 36, height: 36)
                                    .background(account.color.opacity(0.1))
                                    .cornerRadius(8)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Login as \(account.label)")
                                        .font(Theme.subheadlineFont)
                                        .foregroundColor(Theme.gray800)
                                    Text(account.email)
                                        .font(Theme.captionFont)
                                        .foregroundColor(Theme.gray500)
                                }

                                Spacer()

                                Image(systemName: "arrow.right")
                                    .font(.system(size: 14))
                                    .foregroundColor(Theme.gray400)
                            }
                            .padding(12)
                            .background(Color.white)
                            .cornerRadius(Theme.cornerRadiusSmall)
                            .overlay(
                                RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall)
                                    .stroke(Theme.gray200, lineWidth: 1)
                            )
                        }
                        .disabled(viewModel.isLoading)
                    }
                }

                Spacer(minLength: 40)
            }
            .padding(.horizontal, Theme.paddingLarge)
        }
        .background(Theme.gray50.ignoresSafeArea())
    }
}

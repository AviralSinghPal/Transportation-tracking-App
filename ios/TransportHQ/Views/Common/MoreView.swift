import SwiftUI

struct MoreView: View {
    @ObservedObject private var authService = AuthService.shared
    @ObservedObject private var socketService = SocketService.shared

    var body: some View {
        NavigationStack {
            List {
                // Profile Section
                Section {
                    if let user = authService.currentUser {
                        HStack(spacing: 14) {
                            Circle()
                                .fill(Theme.primary.opacity(0.1))
                                .frame(width: 56, height: 56)
                                .overlay(
                                    Text(user.initials)
                                        .font(.system(size: 20, weight: .bold))
                                        .foregroundColor(Theme.primary)
                                )

                            VStack(alignment: .leading, spacing: 4) {
                                Text(user.fullName)
                                    .font(Theme.subheadlineFont)
                                    .foregroundColor(Theme.gray900)
                                Text(user.email)
                                    .font(Theme.captionFont)
                                    .foregroundColor(Theme.gray500)
                                StatusBadge(user.role.rawValue.capitalized, color: Theme.primary)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }

                // Connection Status
                Section("Connection") {
                    HStack {
                        Label("Socket.IO", systemImage: "network")
                        Spacer()
                        HStack(spacing: 6) {
                            Circle()
                                .fill(socketService.isConnected ? Theme.green : Theme.red)
                                .frame(width: 8, height: 8)
                            Text(socketService.isConnected ? "Connected" : "Disconnected")
                                .font(Theme.captionFont)
                                .foregroundColor(socketService.isConnected ? Theme.green : Theme.red)
                        }
                    }

                    if authService.currentUser?.role == .driver {
                        HStack {
                            Label("GPS Sharing", systemImage: "location.fill")
                            Spacer()
                            HStack(spacing: 6) {
                                Circle()
                                    .fill(LocationService.shared.isSharing ? Theme.green : Theme.gray400)
                                    .frame(width: 8, height: 8)
                                Text(LocationService.shared.isSharing ? "Active" : "Inactive")
                                    .font(Theme.captionFont)
                                    .foregroundColor(LocationService.shared.isSharing ? Theme.green : Theme.gray400)
                            }
                        }
                    }
                }

                // App Info
                Section("About") {
                    HStack {
                        Label("Version", systemImage: "info.circle")
                        Spacer()
                        Text("1.0.0")
                            .font(Theme.captionFont)
                            .foregroundColor(Theme.gray500)
                    }
                    HStack {
                        Label("API Server", systemImage: "server.rack")
                        Spacer()
                        Text("localhost:5001")
                            .font(Theme.captionFont)
                            .foregroundColor(Theme.gray500)
                    }
                }

                // Logout
                Section {
                    Button(role: .destructive) {
                        authService.logout()
                    } label: {
                        HStack {
                            Spacer()
                            Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                                .font(Theme.subheadlineFont)
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("More")
        }
    }
}

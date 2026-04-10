import SwiftUI

struct NotificationsView: View {
    @StateObject private var viewModel = NotificationsViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.notifications.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.notifications.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "bell.slash")
                            .font(.system(size: 48))
                            .foregroundColor(Theme.gray300)
                        Text("No notifications")
                            .font(Theme.headlineFont)
                            .foregroundColor(Theme.gray500)
                        Text("You're all caught up!")
                            .font(Theme.captionFont)
                            .foregroundColor(Theme.gray400)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        if !viewModel.unreadNotifications.isEmpty {
                            Section("Unread") {
                                ForEach(viewModel.unreadNotifications) { notification in
                                    NotificationRow(notification: notification, isUnread: true)
                                        .onTapGesture {
                                            Task { await viewModel.markAsRead(notification) }
                                        }
                                }
                            }
                        }

                        if !viewModel.readNotifications.isEmpty {
                            Section("Earlier") {
                                ForEach(viewModel.readNotifications) { notification in
                                    NotificationRow(notification: notification, isUnread: false)
                                }
                            }
                        }
                    }
                    .listStyle(.insetGrouped)
                    .refreshable {
                        await viewModel.loadNotifications()
                    }
                }
            }
            .background(Theme.gray50.ignoresSafeArea())
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .primaryAction) {
                    if viewModel.unreadCount > 0 {
                        Button("Read All") {
                            Task { await viewModel.markAllAsRead() }
                        }
                    }
                }
            }
            .task {
                await viewModel.loadNotifications()
            }
        }
    }
}

struct NotificationRow: View {
    let notification: AppNotification
    let isUnread: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Icon
            Image(systemName: iconForType(notification.type))
                .font(.system(size: 16))
                .foregroundColor(isUnread ? Theme.primary : Theme.gray400)
                .frame(width: 36, height: 36)
                .background(isUnread ? Theme.primary.opacity(0.1) : Theme.gray100)
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 3) {
                Text(notification.title ?? "Notification")
                    .font(Theme.subheadlineFont)
                    .fontWeight(isUnread ? .semibold : .regular)
                    .foregroundColor(Theme.gray900)
                    .lineLimit(1)

                Text(notification.message ?? "")
                    .font(Theme.captionFont)
                    .foregroundColor(Theme.gray600)
                    .lineLimit(2)

                if let time = notification.createdAt {
                    Text(formatDate(time))
                        .font(.system(size: 11))
                        .foregroundColor(Theme.gray400)
                }
            }

            Spacer()

            if isUnread {
                Circle()
                    .fill(Theme.primary)
                    .frame(width: 8, height: 8)
            }
        }
        .padding(.vertical, 4)
        .listRowBackground(isUnread ? Theme.primary.opacity(0.03) : Color.clear)
    }

    func iconForType(_ type: String?) -> String {
        switch type {
        case "ride_request": return "car.fill"
        case "trip": return "map.fill"
        case "driver": return "person.fill"
        case "chat": return "message.fill"
        default: return "bell.fill"
        }
    }

    func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: dateString) {
            let display = DateFormatter()
            display.dateFormat = "MMM d, h:mm a"
            return display.string(from: date)
        }
        let formatter2 = ISO8601DateFormatter()
        if let date = formatter2.date(from: dateString) {
            let display = DateFormatter()
            display.dateFormat = "MMM d, h:mm a"
            return display.string(from: date)
        }
        return dateString
    }
}

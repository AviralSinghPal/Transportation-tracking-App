import Foundation
import Combine

@MainActor
final class NotificationsViewModel: ObservableObject {
    @Published var notifications: [AppNotification] = []
    @Published var unreadCount: Int = 0
    @Published var isLoading = false
    @Published var errorMessage: String?

    private var cancellables = Set<AnyCancellable>()

    var unreadNotifications: [AppNotification] {
        notifications.filter { $0.read != true }
    }

    var readNotifications: [AppNotification] {
        notifications.filter { $0.read == true }
    }

    init() {
        SocketService.shared.notificationSubject
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                Task { await self?.loadNotifications() }
            }
            .store(in: &cancellables)
    }

    func loadNotifications() async {
        isLoading = true
        do {
            async let notifs = APIService.shared.getNotifications()
            async let count = APIService.shared.getUnreadCount()
            notifications = try await notifs
            unreadCount = try await count.count
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func markAsRead(_ notification: AppNotification) async {
        do {
            _ = try await APIService.shared.markNotificationRead(id: notification.id)
            await loadNotifications()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func markAllAsRead() async {
        do {
            _ = try await APIService.shared.markAllNotificationsRead()
            await loadNotifications()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

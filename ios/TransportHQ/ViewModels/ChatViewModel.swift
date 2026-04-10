import Foundation
import Combine

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var conversations: [Conversation] = []
    @Published var contacts: [ChatContact] = []
    @Published var isLoading = false

    func loadData() async {
        isLoading = true
        do {
            async let c = APIService.shared.getConversations()
            async let ct = APIService.shared.getContacts()
            conversations = try await c
            contacts = try await ct
        } catch {
            print("Chat load error: \(error)")
        }
        isLoading = false
    }
}

@MainActor
final class ChatConversationViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var isLoading = false
    @Published var currentUserId: String = ""

    private var cancellables = Set<AnyCancellable>()
    private var receiverId: String = ""

    init() {
        currentUserId = AuthService.shared.currentUser?.id ?? ""

        SocketService.shared.chatMessageSubject
            .receive(on: DispatchQueue.main)
            .sink { [weak self] in
                guard let self = self, !self.receiverId.isEmpty else { return }
                Task { await self.loadMessages(userId: self.receiverId) }
            }
            .store(in: &cancellables)
    }

    func loadMessages(userId: String) async {
        receiverId = userId
        isLoading = messages.isEmpty
        do {
            let msgs = try await APIService.shared.getMessages(userId: userId)
            messages = msgs.reversed()
        } catch {
            print("Messages load error: \(error)")
        }
        isLoading = false
    }

    func sendMessage(text: String) async {
        guard !text.isEmpty, !receiverId.isEmpty else { return }
        do {
            _ = try await APIService.shared.sendMessage(receiverId: receiverId, message: text)
            await loadMessages(userId: receiverId)
        } catch {
            print("Send error: \(error)")
        }
    }
}

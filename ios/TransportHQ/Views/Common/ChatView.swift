import SwiftUI

struct ChatView: View {
    @StateObject private var viewModel = ChatViewModel()
    @State private var selectedTab = 0
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("", selection: $selectedTab) {
                    Text("Conversations").tag(0)
                    Text("Contacts").tag(1)
                }
                .pickerStyle(.segmented)
                .padding()

                if viewModel.isLoading {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    switch selectedTab {
                    case 0: ConversationsListView(conversations: viewModel.conversations)
                    case 1: ContactsListView(contacts: viewModel.contacts)
                    default: EmptyView()
                    }
                }
            }
            .background(Theme.gray50.ignoresSafeArea())
            .navigationTitle("Chat")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .task { await viewModel.loadData() }
            .refreshable { await viewModel.loadData() }
        }
    }
}

struct ConversationsListView: View {
    let conversations: [Conversation]

    var body: some View {
        if conversations.isEmpty {
            VStack(spacing: 12) {
                Image(systemName: "message").font(.system(size: 48)).foregroundColor(Theme.gray300)
                Text("No conversations").font(Theme.headlineFont).foregroundColor(Theme.gray500)
                Text("Start a chat from Contacts").font(Theme.captionFont).foregroundColor(Theme.gray400)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            List(conversations) { conv in
                NavigationLink(destination: ChatConversationView(
                    userId: conv.user?.id ?? "",
                    userName: conv.user?.displayName ?? "Unknown"
                )) {
                    HStack(spacing: 12) {
                        Circle()
                            .fill(Theme.primary.opacity(0.1))
                            .frame(width: 44, height: 44)
                            .overlay(
                                Text(conv.user?.initials ?? "?")
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundColor(Theme.primary)
                            )

                        VStack(alignment: .leading, spacing: 2) {
                            HStack {
                                Text(conv.user?.displayName ?? "Unknown")
                                    .font(Theme.subheadlineFont).fontWeight(.semibold)
                                Spacer()
                                Text(conv.lastMessageAt?.prefix(10) ?? "")
                                    .font(.system(size: 11)).foregroundColor(Theme.gray400)
                            }
                            Text(conv.lastMessage ?? "")
                                .font(Theme.captionFont).foregroundColor(Theme.gray500).lineLimit(1)
                        }

                        if let count = conv.unreadCount, count > 0 {
                            Text("\(count)")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.white)
                                .frame(width: 22, height: 22)
                                .background(Theme.primary)
                                .clipShape(Circle())
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
            .listStyle(.plain)
        }
    }
}

struct ContactsListView: View {
    let contacts: [ChatContact]

    var body: some View {
        if contacts.isEmpty {
            Text("No contacts found").foregroundColor(Theme.gray500).frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            List(contacts) { contact in
                NavigationLink(destination: ChatConversationView(
                    userId: contact.id,
                    userName: contact.displayName
                )) {
                    HStack(spacing: 12) {
                        Circle()
                            .fill(Theme.gray100)
                            .frame(width: 38, height: 38)
                            .overlay(
                                Text(contact.initials)
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(Theme.gray600)
                            )
                        VStack(alignment: .leading, spacing: 2) {
                            Text(contact.displayName).font(Theme.subheadlineFont).foregroundColor(Theme.gray900)
                            Text((contact.role ?? "").capitalized).font(.system(size: 11)).foregroundColor(Theme.gray400)
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
            .listStyle(.plain)
        }
    }
}

struct ChatConversationView: View {
    let userId: String
    let userName: String
    @StateObject private var viewModel = ChatConversationViewModel()
    @State private var messageText = ""

    var body: some View {
        VStack(spacing: 0) {
            // Messages
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 6) {
                        ForEach(viewModel.messages) { message in
                            let isSent = message.sender?.id == viewModel.currentUserId
                            ChatBubble(message: message, isSent: isSent)
                                .id(message.id)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                }
                .onChange(of: viewModel.messages.count) { _ in
                    if let last = viewModel.messages.last {
                        withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                    }
                }
            }

            // Input bar
            HStack(spacing: 8) {
                TextField("Type a message...", text: $messageText)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(1...3)

                Button {
                    let text = messageText
                    messageText = ""
                    Task { await viewModel.sendMessage(text: text) }
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 32))
                        .foregroundColor(messageText.isEmpty ? Theme.gray300 : Theme.primary)
                }
                .disabled(messageText.isEmpty)
            }
            .padding(10)
            .background(Color.white.shadow(color: Theme.shadowColor, radius: 4, y: -2))
        }
        .navigationTitle(userName)
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.loadMessages(userId: userId) }
    }
}

struct ChatBubble: View {
    let message: ChatMessage
    let isSent: Bool

    var body: some View {
        HStack {
            if isSent { Spacer(minLength: 60) }

            VStack(alignment: isSent ? .trailing : .leading, spacing: 2) {
                Text(message.message ?? "")
                    .font(.system(size: 14))
                    .foregroundColor(isSent ? .white : Theme.gray900)
                    .padding(10)
                    .background(isSent ? Theme.primary : Color.white)
                    .cornerRadius(16, corners: isSent
                        ? [.topLeft, .topRight, .bottomLeft]
                        : [.topLeft, .topRight, .bottomRight])

                if let time = message.createdAt {
                    Text(String(time.suffix(13).prefix(5)))
                        .font(.system(size: 10))
                        .foregroundColor(Theme.gray400)
                }
            }

            if !isSent { Spacer(minLength: 60) }
        }
    }
}

// cornerRadius(_:corners:) extension is defined in LiveMapView.swift

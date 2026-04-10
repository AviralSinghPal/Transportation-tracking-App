package com.transporthq.app.data.models

import com.google.gson.annotations.SerializedName

data class Conversation(
    val user: ContactUser? = null,
    val lastMessage: String = "",
    val lastMessageAt: String? = null,
    val unreadCount: Int = 0
)

data class ChatMessage(
    @SerializedName("_id") val id: String = "",
    val sender: MessageSender? = null,
    val receiver: String? = null,
    val message: String = "",
    val channel: String? = null,
    val tripId: String? = null,
    val createdAt: String? = null
)

data class MessageSender(
    @SerializedName("_id") val id: String = "",
    val name: String = "",
    val role: String = ""
) {
    val displayName: String get() = name
}

data class ContactUser(
    @SerializedName("_id") val id: String = "",
    val name: String = "",
    val role: String = "",
    val phone: String? = null,
    val email: String? = null
) {
    val displayName: String get() = name
    val initials: String get() {
        val parts = displayName.split(" ")
        return parts.take(2).mapNotNull { it.firstOrNull()?.uppercase() }.joinToString("")
    }
}

data class SendMessageRequest(
    val receiverId: String,
    val message: String,
    val tripId: String? = null
)

data class ConversationsResponse(
    val conversations: List<Conversation> = emptyList()
)

data class MessagesResponse(
    val messages: List<ChatMessage> = emptyList()
)

data class ContactsResponse(
    val contacts: List<ContactUser> = emptyList()
)

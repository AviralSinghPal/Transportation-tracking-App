package com.transporthq.app.data.repository

import com.transporthq.app.data.api.RetrofitClient
import com.transporthq.app.data.models.*

class ChatRepository {

    private val api = RetrofitClient.apiService

    suspend fun getConversations(): Result<List<Conversation>> {
        return try {
            val response = api.getConversations()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to fetch conversations: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getContacts(): Result<List<ContactUser>> {
        return try {
            val response = api.getContacts()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to fetch contacts: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getMessages(userId: String, page: Int = 1): Result<List<ChatMessage>> {
        return try {
            val response = api.getMessages(userId, page)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to fetch messages: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun sendMessage(receiverId: String, message: String, tripId: String? = null): Result<ChatMessage> {
        return try {
            val response = api.sendMessage(SendMessageRequest(receiverId, message, tripId))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to send message: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

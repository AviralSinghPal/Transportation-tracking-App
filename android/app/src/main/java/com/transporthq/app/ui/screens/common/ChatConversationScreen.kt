package com.transporthq.app.ui.screens.common

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.transporthq.app.data.api.SocketManager
import com.transporthq.app.data.models.ChatMessage
import com.transporthq.app.data.repository.AuthRepository
import com.transporthq.app.data.repository.ChatRepository
import com.transporthq.app.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ConversationState(
    val messages: List<ChatMessage> = emptyList(),
    val isLoading: Boolean = false,
    val currentUserId: String = ""
)

class ChatConversationViewModel(application: Application) : AndroidViewModel(application) {
    private val chatRepo = ChatRepository()
    private val authRepo = AuthRepository(application)
    private val _state = MutableStateFlow(ConversationState())
    val state: StateFlow<ConversationState> = _state.asStateFlow()

    private var receiverId: String = ""

    init {
        viewModelScope.launch {
            val session = authRepo.restoreSession()
            session?.second?.let { user ->
                _state.value = _state.value.copy(currentUserId = user.id)
            }
        }

        viewModelScope.launch {
            SocketManager.chatMessage.collect { rawJson ->
                // Reload messages on new chat event
                if (receiverId.isNotBlank()) loadMessages(receiverId)
            }
        }
    }

    fun loadMessages(userId: String) {
        receiverId = userId
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            val result = chatRepo.getMessages(userId)
            result.fold(
                onSuccess = { _state.value = _state.value.copy(messages = it.reversed(), isLoading = false) },
                onFailure = { _state.value = _state.value.copy(isLoading = false) }
            )
        }
    }

    fun sendMessage(text: String) {
        if (text.isBlank() || receiverId.isBlank()) return
        viewModelScope.launch {
            chatRepo.sendMessage(receiverId, text)
            loadMessages(receiverId)
        }
    }
}

@Composable
fun ChatConversationScreen(
    userId: String,
    userName: String,
    onBack: () -> Unit,
    viewModel: ChatConversationViewModel = viewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var messageText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    LaunchedEffect(userId) { viewModel.loadMessages(userId) }
    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) listState.animateScrollToItem(state.messages.size - 1)
    }

    Column(modifier = Modifier.fillMaxSize().background(Gray50)) {
        // Header
        Surface(shadowElevation = 2.dp) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Gray900)
                }
                Box(
                    modifier = Modifier.size(36.dp).clip(CircleShape).background(Indigo100),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        userName.split(" ").take(2).mapNotNull { it.firstOrNull()?.uppercase() }.joinToString(""),
                        fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Indigo600
                    )
                }
                Spacer(modifier = Modifier.width(10.dp))
                Text(userName, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = Gray900)
            }
        }

        // Messages
        LazyColumn(
            modifier = Modifier.weight(1f).padding(horizontal = 12.dp),
            state = listState,
            verticalArrangement = Arrangement.spacedBy(6.dp),
            contentPadding = PaddingValues(vertical = 12.dp)
        ) {
            items(state.messages) { message ->
                val isSent = message.sender?.id == state.currentUserId
                MessageBubble(message = message, isSent = isSent)
            }
        }

        // Input bar
        Surface(shadowElevation = 4.dp) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = messageText,
                    onValueChange = { messageText = it },
                    placeholder = { Text("Type a message...", fontSize = 14.sp) },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(24.dp),
                    singleLine = false,
                    maxLines = 3
                )
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(
                    onClick = {
                        viewModel.sendMessage(messageText)
                        messageText = ""
                    },
                    enabled = messageText.isNotBlank(),
                    modifier = Modifier.size(44.dp).clip(CircleShape).background(
                        if (messageText.isNotBlank()) Indigo600 else Gray200
                    )
                ) {
                    Icon(
                        Icons.Default.Send,
                        contentDescription = "Send",
                        tint = if (messageText.isNotBlank()) White else Gray400,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun MessageBubble(message: ChatMessage, isSent: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isSent) Arrangement.End else Arrangement.Start
    ) {
        Box(
            modifier = Modifier
                .widthIn(max = 280.dp)
                .clip(RoundedCornerShape(
                    topStart = 16.dp, topEnd = 16.dp,
                    bottomStart = if (isSent) 16.dp else 4.dp,
                    bottomEnd = if (isSent) 4.dp else 16.dp
                ))
                .background(if (isSent) Indigo600 else White)
                .padding(10.dp)
        ) {
            Column {
                Text(
                    message.message,
                    fontSize = 14.sp,
                    color = if (isSent) White else Gray900
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    message.createdAt?.takeLast(13)?.take(5) ?: "",
                    fontSize = 10.sp,
                    color = if (isSent) White.copy(alpha = 0.7f) else Gray400
                )
            }
        }
    }
}

package com.transporthq.app.ui.screens.common

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.transporthq.app.data.models.ContactUser
import com.transporthq.app.data.models.Conversation
import com.transporthq.app.data.repository.ChatRepository
import com.transporthq.app.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ChatListState(
    val conversations: List<Conversation> = emptyList(),
    val contacts: List<ContactUser> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

class ChatListViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = ChatRepository()
    private val _state = MutableStateFlow(ChatListState())
    val state: StateFlow<ChatListState> = _state.asStateFlow()

    init { loadData() }

    fun loadData() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            val convResult = repository.getConversations()
            val contactsResult = repository.getContacts()
            _state.value = _state.value.copy(
                conversations = convResult.getOrDefault(emptyList()),
                contacts = contactsResult.getOrDefault(emptyList()),
                isLoading = false
            )
        }
    }
}

@Composable
fun ChatScreen(
    viewModel: ChatListViewModel = viewModel(),
    onBack: (() -> Unit)? = null,
    onOpenConversation: (String, String) -> Unit
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var selectedTab by remember { mutableIntStateOf(0) }

    Column(modifier = Modifier.fillMaxSize().background(Gray50)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (onBack != null) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Gray900)
                }
            }
            Text("Chat", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Gray900)
            Spacer(modifier = Modifier.weight(1f))
            IconButton(onClick = { viewModel.loadData() }) {
                Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = Indigo600)
            }
        }

        TabRow(selectedTabIndex = selectedTab, containerColor = White) {
            Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 },
                text = { Text("Conversations") })
            Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 },
                text = { Text("Contacts") })
        }

        if (state.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Indigo600)
            }
        } else {
            when (selectedTab) {
                0 -> ConversationsList(state.conversations, onOpenConversation)
                1 -> ContactsList(state.contacts, onOpenConversation)
            }
        }
    }
}

@Composable
private fun ConversationsList(
    conversations: List<Conversation>,
    onOpen: (String, String) -> Unit
) {
    if (conversations.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.Chat, tint = Gray400, modifier = Modifier.size(64.dp), contentDescription = null)
                Spacer(modifier = Modifier.height(12.dp))
                Text("No conversations yet", color = Gray500, fontSize = 16.sp)
                Text("Start a chat from Contacts tab", color = Gray400, fontSize = 13.sp)
            }
        }
    } else {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(conversations) { conv ->
                val user = conv.user ?: return@items
                Card(
                    modifier = Modifier.fillMaxWidth().clickable { onOpen(user.id, user.displayName) },
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = White)
                ) {
                    Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier.size(44.dp).clip(CircleShape).background(Indigo100),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(user.initials, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Indigo600)
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(user.displayName, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Gray900)
                                Text(
                                    conv.lastMessageAt?.take(10) ?: "",
                                    fontSize = 11.sp, color = Gray400
                                )
                            }
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(conv.lastMessage, fontSize = 13.sp, color = Gray500, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                        if (conv.unreadCount > 0) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Box(
                                modifier = Modifier.size(22.dp).clip(CircleShape).background(Indigo600),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("${conv.unreadCount}", color = White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ContactsList(
    contacts: List<ContactUser>,
    onOpen: (String, String) -> Unit
) {
    if (contacts.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No contacts found", color = Gray500, fontSize = 16.sp)
        }
    } else {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(contacts) { contact ->
                Card(
                    modifier = Modifier.fillMaxWidth().clickable { onOpen(contact.id, contact.displayName) },
                    shape = RoundedCornerShape(10.dp),
                    colors = CardDefaults.cardColors(containerColor = White)
                ) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier.size(38.dp).clip(CircleShape).background(Gray100),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(contact.initials, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Gray600)
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(contact.displayName, fontWeight = FontWeight.Medium, fontSize = 14.sp, color = Gray900)
                            Text(contact.role.replaceFirstChar { it.uppercase() }, fontSize = 11.sp, color = Gray400)
                        }
                        Icon(Icons.Default.ChevronRight, tint = Gray400, contentDescription = null)
                    }
                }
            }
        }
    }
}

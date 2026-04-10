package com.transporthq.app.ui.screens.coordinator

import android.app.Application
import androidx.compose.foundation.background
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.transporthq.app.data.api.RetrofitClient
import com.transporthq.app.data.models.TalentProfile
import com.transporthq.app.ui.components.StatusBadge
import com.transporthq.app.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class TalentState(
    val profiles: List<TalentProfile> = emptyList(),
    val isLoading: Boolean = false,
    val actionMessage: String? = null
)

class TalentViewModel(application: Application) : AndroidViewModel(application) {
    private val api = RetrofitClient.apiService
    private val _state = MutableStateFlow(TalentState())
    val state: StateFlow<TalentState> = _state.asStateFlow()

    init { loadData() }

    fun loadData() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            try {
                val profiles = api.getTalentProfiles().body() ?: emptyList()
                _state.value = _state.value.copy(profiles = profiles, isLoading = false)
            } catch (e: Exception) { _state.value = _state.value.copy(isLoading = false) }
        }
    }

    fun markTraveling(id: String) {
        viewModelScope.launch {
            try { api.markTalentTraveling(id); _state.value = _state.value.copy(actionMessage = "Marked traveling"); loadData() }
            catch (e: Exception) { _state.value = _state.value.copy(actionMessage = "Failed: ${e.message}") }
        }
    }

    fun markArrived(id: String) {
        viewModelScope.launch {
            try { api.markTalentArrived(id); _state.value = _state.value.copy(actionMessage = "Marked arrived"); loadData() }
            catch (e: Exception) { _state.value = _state.value.copy(actionMessage = "Failed: ${e.message}") }
        }
    }

    fun deleteTalent(id: String) {
        viewModelScope.launch {
            try { api.deleteTalentProfile(id); _state.value = _state.value.copy(actionMessage = "Profile deleted"); loadData() }
            catch (e: Exception) { _state.value = _state.value.copy(actionMessage = "Failed: ${e.message}") }
        }
    }

    fun createTalent(name: String, phone: String, email: String, notes: String) {
        viewModelScope.launch {
            try {
                api.createTalentProfile(mapOf("name" to name, "phone" to phone, "email" to email, "notes" to notes))
                _state.value = _state.value.copy(actionMessage = "Profile created")
                loadData()
            } catch (e: Exception) { _state.value = _state.value.copy(actionMessage = "Failed: ${e.message}") }
        }
    }

    fun clearMessage() { _state.value = _state.value.copy(actionMessage = null) }
}

@Composable
fun TalentScreen(viewModel: TalentViewModel = viewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showCreateDialog by remember { mutableStateOf(false) }

    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(state.actionMessage) { state.actionMessage?.let { snackbarHostState.showSnackbar(it); viewModel.clearMessage() } }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().background(Gray50)) {
            Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Talent Profiles", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Gray900)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    IconButton(onClick = { viewModel.loadData() }) { Icon(Icons.Default.Refresh, tint = Indigo600, contentDescription = "Refresh") }
                    Button(onClick = { showCreateDialog = true }, colors = ButtonDefaults.buttonColors(containerColor = Indigo600), shape = RoundedCornerShape(8.dp)) {
                        Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Add Talent", fontSize = 13.sp)
                    }
                }
            }

            if (state.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Indigo600) }
            } else {
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(state.profiles) { talent -> TalentCard(talent = talent, onTraveling = { viewModel.markTraveling(talent.id) }, onArrived = { viewModel.markArrived(talent.id) }, onDelete = { viewModel.deleteTalent(talent.id) }) }
                    if (state.profiles.isEmpty()) {
                        item { Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.Star, tint = Gray400, modifier = Modifier.size(48.dp), contentDescription = null)
                                Spacer(modifier = Modifier.height(8.dp))
                                Text("No talent profiles", color = Gray500)
                            }
                        } }
                    }
                }
            }
        }
        SnackbarHost(hostState = snackbarHostState, modifier = Modifier.align(Alignment.BottomCenter))
    }

    if (showCreateDialog) {
        var name by remember { mutableStateOf("") }
        var phone by remember { mutableStateOf("") }
        var email by remember { mutableStateOf("") }
        AlertDialog(onDismissRequest = { showCreateDialog = false },
            title = { Text("Add Talent", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp))
                    OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Phone") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp))
                    OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp))
                }
            },
            confirmButton = { Button(onClick = { viewModel.createTalent(name, phone, email, ""); showCreateDialog = false }, enabled = name.isNotBlank(), colors = ButtonDefaults.buttonColors(containerColor = Indigo600)) { Text("Add") } },
            dismissButton = { TextButton(onClick = { showCreateDialog = false }) { Text("Cancel") } },
            shape = RoundedCornerShape(16.dp))
    }
}

@Composable
private fun TalentCard(talent: TalentProfile, onTraveling: () -> Unit, onArrived: () -> Unit, onDelete: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = White), elevation = CardDefaults.cardElevation(2.dp)) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(44.dp).clip(CircleShape).background(Indigo100), contentAlignment = Alignment.Center) {
                        Text(talent.name.firstOrNull()?.uppercase() ?: "?", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Indigo600)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(talent.name, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Gray900)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(talent.phone, fontSize = 11.sp, color = Gray500)
                            if (talent.isConfidential) { StatusBadge(status = "Confidential") }
                        }
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    StatusBadge(status = talent.status)
                    IconButton(onClick = onDelete, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Default.Delete, tint = Red500, modifier = Modifier.size(14.dp), contentDescription = "Delete")
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Preferences chips
            if (talent.vehiclePreference.isNotBlank() || talent.musicPreference.isNotBlank() || talent.waterPreference.isNotBlank() || talent.snackPreference.isNotBlank()) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                    listOf(talent.vehiclePreference to "🚗", talent.musicPreference to "🎵", talent.waterPreference to "💧", talent.snackPreference to "🍿", talent.drinkPreference to "☕")
                        .filter { it.first.isNotBlank() }
                        .forEach { (pref, emoji) ->
                            Surface(shape = RoundedCornerShape(16.dp), color = Gray100) {
                                Text("$emoji $pref", fontSize = 11.sp, color = Gray600, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                            }
                        }
                }
                Spacer(modifier = Modifier.height(6.dp))
            }

            // Hotel & Agent
            if (talent.hotelName.isNotBlank()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Hotel, contentDescription = null, tint = Gray400, modifier = Modifier.size(12.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Hotel: ${talent.hotelName}${if (talent.hotelAddress.isNotBlank()) ", ${talent.hotelAddress}" else ""}", fontSize = 11.sp, color = Gray500)
                }
            }
            if (talent.agentName.isNotBlank()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Phone, contentDescription = null, tint = Gray400, modifier = Modifier.size(12.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Agent: ${talent.agentName}${if (talent.agentPhone.isNotBlank()) " (${talent.agentPhone})" else ""}", fontSize = 11.sp, color = Gray500)
                }
            }

            if (talent.preferredDriver != null) {
                Text("Preferred Driver: ${talent.preferredDriver.name}", fontSize = 11.sp, color = Gray500)
            }

            // Stats
            Text("${talent.totalTrips} trips • $${String.format("%.0f", talent.totalCost)} total cost • ${String.format("%.0f", talent.totalMiles)} miles", fontSize = 11.sp, color = Gray400)

            Spacer(modifier = Modifier.height(10.dp))
            Divider(color = Gray200)
            Spacer(modifier = Modifier.height(8.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onTraveling, colors = ButtonDefaults.buttonColors(containerColor = Indigo600), shape = RoundedCornerShape(6.dp), contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)) {
                    Icon(Icons.Default.FlightTakeoff, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Talent Traveling", fontSize = 11.sp)
                }
                Button(onClick = onArrived, colors = ButtonDefaults.buttonColors(containerColor = Green600), shape = RoundedCornerShape(6.dp), contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Talent Arrived", fontSize = 11.sp)
                }
            }
        }
    }
}

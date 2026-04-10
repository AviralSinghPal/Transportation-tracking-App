package com.transporthq.app.ui.screens.coordinator

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.transporthq.app.data.api.RetrofitClient
import com.transporthq.app.data.models.MaintenanceRecord
import com.transporthq.app.ui.components.StatusBadge
import com.transporthq.app.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class MaintenanceState(
    val records: List<MaintenanceRecord> = emptyList(),
    val alerts: List<MaintenanceRecord> = emptyList(),
    val isLoading: Boolean = false,
    val actionMessage: String? = null
)

class MaintenanceViewModel(application: Application) : AndroidViewModel(application) {
    private val api = RetrofitClient.apiService
    private val _state = MutableStateFlow(MaintenanceState())
    val state: StateFlow<MaintenanceState> = _state.asStateFlow()

    init { loadData() }

    fun loadData() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            try {
                val records = api.getMaintenance().body() ?: emptyList()
                val alerts = api.getMaintenanceAlerts().body() ?: emptyList()
                _state.value = _state.value.copy(records = records, alerts = alerts, isLoading = false)
            } catch (e: Exception) { _state.value = _state.value.copy(isLoading = false) }
        }
    }

    fun markComplete(id: String) {
        viewModelScope.launch {
            try {
                api.updateMaintenance(id, mapOf("status" to "completed"))
                _state.value = _state.value.copy(actionMessage = "Marked complete")
                loadData()
            } catch (e: Exception) { _state.value = _state.value.copy(actionMessage = "Failed: ${e.message}") }
        }
    }

    fun createRecord(vehicleId: String, type: String, title: String, scheduledDate: String, cost: Double) {
        viewModelScope.launch {
            try {
                api.createMaintenance(mapOf(
                    "vehicle" to vehicleId, "type" to type, "title" to title,
                    "scheduledDate" to scheduledDate, "cost" to cost
                ))
                _state.value = _state.value.copy(actionMessage = "Maintenance scheduled")
                loadData()
            } catch (e: Exception) { _state.value = _state.value.copy(actionMessage = "Failed: ${e.message}") }
        }
    }

    fun clearMessage() { _state.value = _state.value.copy(actionMessage = null) }
}

@Composable
fun MaintenanceScreen(viewModel: MaintenanceViewModel = viewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showCreateDialog by remember { mutableStateOf(false) }

    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(state.actionMessage) { state.actionMessage?.let { snackbarHostState.showSnackbar(it); viewModel.clearMessage() } }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().background(Gray50)) {
            Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Maintenance", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Gray900)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    IconButton(onClick = { viewModel.loadData() }) { Icon(Icons.Default.Refresh, tint = Indigo600, contentDescription = "Refresh") }
                    Button(onClick = { showCreateDialog = true }, colors = ButtonDefaults.buttonColors(containerColor = Indigo600), shape = RoundedCornerShape(8.dp)) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Schedule", fontSize = 13.sp)
                    }
                }
            }

            // Alerts
            if (state.alerts.isNotEmpty()) {
                Card(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp), shape = RoundedCornerShape(10.dp), colors = CardDefaults.cardColors(containerColor = Amber600.copy(alpha = 0.1f))) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = Amber600, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("${state.alerts.size} Upcoming/Overdue Maintenance", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = Amber600)
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
            }

            if (state.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Indigo600) }
            } else {
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(state.records) { record ->
                        Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp), colors = CardDefaults.cardColors(containerColor = White)) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(record.title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Gray900)
                                    StatusBadge(status = record.status)
                                }
                                Text("${record.vehicle?.name ?: ""} • ${record.type}", fontSize = 12.sp, color = Gray500)
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Text(record.scheduledDate?.take(10) ?: "", fontSize = 11.sp, color = Gray400)
                                    Text("$${String.format("%.0f", record.cost)}", fontSize = 11.sp, color = Gray400)
                                }
                                if (record.status != "completed") {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Button(onClick = { viewModel.markComplete(record.id) }, shape = RoundedCornerShape(6.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Green600), contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)) {
                                        Text("Mark Complete", fontSize = 12.sp)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        SnackbarHost(hostState = snackbarHostState, modifier = Modifier.align(Alignment.BottomCenter))
    }

    if (showCreateDialog) {
        var title by remember { mutableStateOf("") }
        var type by remember { mutableStateOf("") }
        AlertDialog(onDismissRequest = { showCreateDialog = false },
            title = { Text("Schedule Maintenance", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Title") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp))
                    OutlinedTextField(value = type, onValueChange = { type = it }, label = { Text("Type (e.g. Oil Change)") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp))
                }
            },
            confirmButton = { Button(onClick = { viewModel.createRecord("", type, title, "", 0.0); showCreateDialog = false }, colors = ButtonDefaults.buttonColors(containerColor = Indigo600)) { Text("Schedule") } },
            dismissButton = { TextButton(onClick = { showCreateDialog = false }) { Text("Cancel") } },
            shape = RoundedCornerShape(16.dp))
    }
}

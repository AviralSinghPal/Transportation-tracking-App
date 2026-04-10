package com.transporthq.app.ui.screens.coordinator

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
import com.transporthq.app.data.models.*
import com.transporthq.app.data.repository.VehicleRepository
import com.transporthq.app.ui.components.StatusBadge
import com.transporthq.app.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class FleetState(
    val vehicles: List<Vehicle> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val actionMessage: String? = null
)

class FleetViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = VehicleRepository()

    private val _state = MutableStateFlow(FleetState())
    val state: StateFlow<FleetState> = _state.asStateFlow()

    init { loadVehicles() }

    fun loadVehicles() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            val result = repository.getVehicles()
            result.fold(
                onSuccess = { _state.value = _state.value.copy(vehicles = it, isLoading = false) },
                onFailure = { _state.value = _state.value.copy(isLoading = false, error = it.message) }
            )
        }
    }

    fun createVehicle(request: CreateVehicleRequest) {
        viewModelScope.launch {
            val result = repository.createVehicle(request)
            result.fold(
                onSuccess = { _state.value = _state.value.copy(actionMessage = "Vehicle added"); loadVehicles() },
                onFailure = { _state.value = _state.value.copy(actionMessage = "Failed: ${it.message}") }
            )
        }
    }

    fun updateVehicleStatus(id: String, status: String) {
        viewModelScope.launch {
            val result = repository.updateVehicle(id, UpdateVehicleRequest(status = status))
            result.fold(
                onSuccess = { _state.value = _state.value.copy(actionMessage = "Status updated"); loadVehicles() },
                onFailure = { _state.value = _state.value.copy(actionMessage = "Failed: ${it.message}") }
            )
        }
    }

    fun deleteVehicle(id: String) {
        viewModelScope.launch {
            val result = repository.deleteVehicle(id)
            result.fold(
                onSuccess = { _state.value = _state.value.copy(actionMessage = "Vehicle deleted"); loadVehicles() },
                onFailure = { _state.value = _state.value.copy(actionMessage = "Failed: ${it.message}") }
            )
        }
    }

    fun clearMessage() { _state.value = _state.value.copy(actionMessage = null) }
}

@Composable
fun FleetScreen(viewModel: FleetViewModel = viewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showAddDialog by remember { mutableStateOf(false) }
    var showDeleteConfirm by remember { mutableStateOf<Vehicle?>(null) }

    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(state.actionMessage) {
        state.actionMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearMessage()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().background(Gray50)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Fleet", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Gray900)
                    Text("${state.vehicles.size} vehicles", fontSize = 14.sp, color = Gray500)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    IconButton(onClick = { viewModel.loadVehicles() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = Indigo600)
                    }
                    Button(
                        onClick = { showAddDialog = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Indigo600),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Add Vehicle", fontSize = 13.sp)
                    }
                }
            }

            // Stats row
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                val total = state.vehicles.size
                val available = state.vehicles.count { it.status == "available" }
                val inUse = state.vehicles.count { it.status == "in-use" || it.status == "in_use" }
                val maintenance = state.vehicles.count { it.status == "maintenance" }
                StatCard(Modifier.weight(1f), "$total", "Total", Gray600)
                StatCard(Modifier.weight(1f), "$available", "Available", Green600)
                StatCard(Modifier.weight(1f), "$inUse", "In Use", Indigo600)
                StatCard(Modifier.weight(1f), "$maintenance", "Maintenance", Amber600)
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (state.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Indigo600)
                }
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(state.vehicles) { vehicle ->
                        VehicleCard(
                            vehicle = vehicle,
                            onStatusChange = { newStatus ->
                                viewModel.updateVehicleStatus(vehicle.id, newStatus)
                            },
                            onDelete = { showDeleteConfirm = vehicle }
                        )
                    }
                }
            }
        }

        SnackbarHost(hostState = snackbarHostState, modifier = Modifier.align(Alignment.BottomCenter))
    }

    if (showAddDialog) {
        VehicleFormDialog(
            onSubmit = { request -> viewModel.createVehicle(request); showAddDialog = false },
            onDismiss = { showAddDialog = false }
        )
    }

    showDeleteConfirm?.let { vehicle ->
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = null },
            title = { Text("Delete Vehicle", fontWeight = FontWeight.Bold) },
            text = { Text("Delete ${vehicle.name} (${vehicle.plateNumber})?") },
            confirmButton = {
                Button(
                    onClick = { viewModel.deleteVehicle(vehicle.id); showDeleteConfirm = null },
                    colors = ButtonDefaults.buttonColors(containerColor = Red500)
                ) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { showDeleteConfirm = null }) { Text("Cancel") } },
            shape = RoundedCornerShape(16.dp)
        )
    }
}

@Composable
private fun StatCard(modifier: Modifier, value: String, label: String, color: androidx.compose.ui.graphics.Color) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = White)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(value, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = color)
            Text(label, fontSize = 11.sp, color = Gray500)
        }
    }
}

@Composable
private fun VehicleCard(vehicle: Vehicle, onStatusChange: (String) -> Unit, onDelete: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.DirectionsCar, contentDescription = null, tint = Gray400, modifier = Modifier.size(24.dp))
                StatusBadge(status = vehicle.status)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(vehicle.name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Gray900)
            Text("${vehicle.plateNumber} • ${vehicle.capacity} seats • ${vehicle.type}",
                fontSize = 11.sp, color = Gray500)

            Spacer(modifier = Modifier.height(10.dp))
            Divider(color = Gray200)
            Spacer(modifier = Modifier.height(8.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                if (vehicle.status != "available") {
                    OutlinedButton(
                        onClick = { onStatusChange("available") },
                        shape = RoundedCornerShape(6.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                        modifier = Modifier.height(30.dp)
                    ) { Text("Available", fontSize = 10.sp, color = Green600) }
                }
                if (vehicle.status != "maintenance") {
                    OutlinedButton(
                        onClick = { onStatusChange("maintenance") },
                        shape = RoundedCornerShape(6.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                        modifier = Modifier.height(30.dp)
                    ) { Text("Maint.", fontSize = 10.sp, color = Amber600) }
                }
                IconButton(onClick = onDelete, modifier = Modifier.size(30.dp)) {
                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Red500, modifier = Modifier.size(16.dp))
                }
            }
        }
    }
}

@Composable
private fun VehicleFormDialog(onSubmit: (CreateVehicleRequest) -> Unit, onDismiss: () -> Unit) {
    var name by remember { mutableStateOf("") }
    var plateNumber by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("sedan") }
    var capacity by remember { mutableStateOf("4") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Vehicle", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name, onValueChange = { name = it },
                    label = { Text("Vehicle Name") }, modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )
                OutlinedTextField(
                    value = plateNumber, onValueChange = { plateNumber = it },
                    label = { Text("Plate Number") }, modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )
                OutlinedTextField(
                    value = type, onValueChange = { type = it },
                    label = { Text("Type (sedan, suv, van, minibus)") }, modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )
                OutlinedTextField(
                    value = capacity, onValueChange = { capacity = it },
                    label = { Text("Capacity") }, modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onSubmit(CreateVehicleRequest(
                        name = name, plateNumber = plateNumber,
                        type = type, capacity = capacity.toIntOrNull() ?: 4
                    ))
                },
                enabled = name.isNotBlank() && plateNumber.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = Indigo600),
                shape = RoundedCornerShape(8.dp)
            ) { Text("Add") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel", color = Gray500) } },
        shape = RoundedCornerShape(16.dp)
    )
}

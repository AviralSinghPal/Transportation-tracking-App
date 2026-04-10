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
import com.transporthq.app.data.models.*
import com.transporthq.app.data.repository.DriverRepository
import com.transporthq.app.data.repository.TripRepository
import com.transporthq.app.data.repository.VehicleRepository
import com.transporthq.app.ui.components.StatusBadge
import com.transporthq.app.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class TripDetailState(
    val trip: Trip? = null,
    val events: List<TripEvent> = emptyList(),
    val drivers: List<Driver> = emptyList(),
    val vehicles: List<Vehicle> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val actionMessage: String? = null
)

class TripDetailViewModel(application: Application) : AndroidViewModel(application) {
    private val tripRepo = TripRepository()
    private val driverRepo = DriverRepository()
    private val vehicleRepo = VehicleRepository()
    private val _state = MutableStateFlow(TripDetailState())
    val state: StateFlow<TripDetailState> = _state.asStateFlow()

    fun loadTrip(id: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            val detailResult = tripRepo.getTripDetail(id)
            val driversResult = driverRepo.getAvailableDrivers()
            val vehiclesResult = vehicleRepo.getVehicles()
            detailResult.fold(
                onSuccess = {
                    _state.value = _state.value.copy(
                        trip = it.trip, events = it.events,
                        drivers = driversResult.getOrDefault(emptyList()),
                        vehicles = vehiclesResult.getOrDefault(emptyList()),
                        isLoading = false
                    )
                },
                onFailure = { _state.value = _state.value.copy(isLoading = false, error = it.message) }
            )
        }
    }

    fun assignTrip(tripId: String, driverId: String, vehicleId: String) {
        viewModelScope.launch {
            val result = tripRepo.assignTrip(tripId, driverId, vehicleId)
            result.fold(
                onSuccess = { _state.value = _state.value.copy(actionMessage = "Trip assigned"); loadTrip(tripId) },
                onFailure = { _state.value = _state.value.copy(actionMessage = "Failed: ${it.message}") }
            )
        }
    }

    fun cancelTrip(tripId: String) {
        viewModelScope.launch {
            val result = tripRepo.cancelTrip(tripId)
            result.fold(
                onSuccess = { _state.value = _state.value.copy(actionMessage = "Trip cancelled") },
                onFailure = { _state.value = _state.value.copy(actionMessage = "Failed: ${it.message}") }
            )
        }
    }

    fun clearMessage() { _state.value = _state.value.copy(actionMessage = null) }
}

@Composable
fun TripDetailScreen(
    tripId: String,
    onBack: () -> Unit,
    viewModel: TripDetailViewModel = viewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showAssignDialog by remember { mutableStateOf(false) }
    var showCancelConfirm by remember { mutableStateOf(false) }

    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(state.actionMessage) {
        state.actionMessage?.let { snackbarHostState.showSnackbar(it); viewModel.clearMessage() }
    }

    LaunchedEffect(tripId) { viewModel.loadTrip(tripId) }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().background(Gray50)) {
            // Top bar
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Gray900)
                }
                Text("Trip Detail", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Gray900)
            }

            if (state.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Indigo600)
                }
            } else if (state.trip != null) {
                val trip = state.trip!!
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Trip info card
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = White)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Trip Info", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Gray900)
                                    StatusBadge(status = trip.status)
                                }
                                Spacer(modifier = Modifier.height(12.dp))

                                // Pickup
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.TripOrigin, contentDescription = null, tint = Green600, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(trip.displayPickup,
                                        fontSize = 13.sp, color = Gray700)
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.LocationOn, contentDescription = null, tint = Red500, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(trip.displayDropoff,
                                        fontSize = 13.sp, color = Gray700)
                                }

                                // Driver & Vehicle
                                if (trip.driver != null) {
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Divider(color = Gray200)
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Person, contentDescription = null, tint = Indigo600, modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Driver: ${trip.driver.name}", fontSize = 13.sp, color = Gray700)
                                    }
                                }
                                if (trip.vehicle != null) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.DirectionsCar, contentDescription = null, tint = Indigo600, modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Vehicle: ${trip.vehicle.name} (${trip.vehicle.plateNumber})",
                                            fontSize = 13.sp, color = Gray700)
                                    }
                                }
                            }
                        }
                    }

                    // Action buttons
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            if (trip.driver == null && trip.status != "cancelled" && trip.status != "completed") {
                                Button(
                                    onClick = { showAssignDialog = true },
                                    colors = ButtonDefaults.buttonColors(containerColor = Indigo600),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Assign", fontSize = 13.sp)
                                }
                            }
                            if (trip.status != "cancelled" && trip.status != "completed") {
                                OutlinedButton(
                                    onClick = { showCancelConfirm = true },
                                    shape = RoundedCornerShape(8.dp),
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Red500),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(Icons.Default.Cancel, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Cancel Trip", fontSize = 13.sp)
                                }
                            }
                        }
                    }

                    // Timeline header
                    if (state.events.isNotEmpty()) {
                        item {
                            Text("Timeline", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Gray900)
                        }
                        items(state.events) { event ->
                            TimelineItem(event)
                        }
                    }
                }
            }
        }
        SnackbarHost(hostState = snackbarHostState, modifier = Modifier.align(Alignment.BottomCenter))
    }

    if (showAssignDialog) {
        AssignTripDialog(
            drivers = state.drivers,
            vehicles = state.vehicles,
            onAssign = { driverId, vehicleId ->
                viewModel.assignTrip(tripId, driverId, vehicleId)
                showAssignDialog = false
            },
            onDismiss = { showAssignDialog = false }
        )
    }

    if (showCancelConfirm) {
        AlertDialog(
            onDismissRequest = { showCancelConfirm = false },
            title = { Text("Cancel Trip", fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to cancel this trip?") },
            confirmButton = {
                Button(
                    onClick = { viewModel.cancelTrip(tripId); showCancelConfirm = false; onBack() },
                    colors = ButtonDefaults.buttonColors(containerColor = Red500)
                ) { Text("Cancel Trip") }
            },
            dismissButton = { TextButton(onClick = { showCancelConfirm = false }) { Text("Keep") } },
            shape = RoundedCornerShape(16.dp)
        )
    }
}

@Composable
private fun TimelineItem(event: TripEvent) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = White)
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.Top) {
            Box(
                modifier = Modifier.size(32.dp).clip(CircleShape).background(Indigo100),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = when {
                        event.type.contains("created", true) -> Icons.Default.Add
                        event.type.contains("assigned", true) -> Icons.Default.PersonAdd
                        event.type.contains("departed", true) -> Icons.Default.DirectionsCar
                        event.type.contains("arrived", true) -> Icons.Default.LocationOn
                        event.type.contains("completed", true) -> Icons.Default.CheckCircle
                        event.type.contains("cancelled", true) -> Icons.Default.Cancel
                        else -> Icons.Default.Info
                    },
                    contentDescription = null, tint = Indigo600, modifier = Modifier.size(16.dp)
                )
            }
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    event.type.replace("_", " ").replaceFirstChar { it.uppercase() },
                    fontWeight = FontWeight.Medium, fontSize = 13.sp, color = Gray900
                )
                if (!event.details.isNullOrBlank()) {
                    Text(event.details, fontSize = 12.sp, color = Gray500)
                }
                if (event.actor != null) {
                    Text("by ${event.actor.name}", fontSize = 11.sp, color = Gray400)
                }
                Text(
                    event.createdAt?.take(16)?.replace("T", " ") ?: "",
                    fontSize = 10.sp, color = Gray400
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AssignTripDialog(
    drivers: List<Driver>,
    vehicles: List<Vehicle>,
    onAssign: (String, String) -> Unit,
    onDismiss: () -> Unit
) {
    var selectedDriverId by remember { mutableStateOf("") }
    var selectedVehicleId by remember { mutableStateOf("") }
    var expandedDriver by remember { mutableStateOf(false) }
    var expandedVehicle by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Assign Trip", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                ExposedDropdownMenuBox(expanded = expandedDriver, onExpandedChange = { expandedDriver = it }) {
                    OutlinedTextField(
                        value = drivers.find { it.id == selectedDriverId }?.name ?: "",
                        onValueChange = {}, readOnly = true,
                        label = { Text("Select Driver") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedDriver) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(), shape = RoundedCornerShape(8.dp)
                    )
                    ExposedDropdownMenu(expanded = expandedDriver, onDismissRequest = { expandedDriver = false }) {
                        drivers.forEach { driver ->
                            DropdownMenuItem(
                                text = { Text(driver.name) },
                                onClick = { selectedDriverId = driver.id; expandedDriver = false }
                            )
                        }
                    }
                }

                ExposedDropdownMenuBox(expanded = expandedVehicle, onExpandedChange = { expandedVehicle = it }) {
                    OutlinedTextField(
                        value = vehicles.find { it.id == selectedVehicleId }?.let { "${it.name} (${it.plateNumber})" } ?: "",
                        onValueChange = {}, readOnly = true,
                        label = { Text("Select Vehicle") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedVehicle) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(), shape = RoundedCornerShape(8.dp)
                    )
                    ExposedDropdownMenu(expanded = expandedVehicle, onDismissRequest = { expandedVehicle = false }) {
                        vehicles.filter { it.status == "available" }.forEach { vehicle ->
                            DropdownMenuItem(
                                text = { Text("${vehicle.name} (${vehicle.plateNumber})") },
                                onClick = { selectedVehicleId = vehicle.id; expandedVehicle = false }
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onAssign(selectedDriverId, selectedVehicleId) },
                enabled = selectedDriverId.isNotBlank() && selectedVehicleId.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
            ) { Text("Assign") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        shape = RoundedCornerShape(16.dp)
    )
}

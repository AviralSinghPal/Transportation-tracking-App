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
import com.transporthq.app.data.models.Driver
import com.transporthq.app.data.models.RideRequest
import com.transporthq.app.data.models.Vehicle
import com.transporthq.app.data.repository.RideRepository
import com.transporthq.app.ui.components.StatusBadge
import com.transporthq.app.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class RideRequestsState(
    val rideRequests: List<RideRequest> = emptyList(),
    val drivers: List<Driver> = emptyList(),
    val vehicles: List<Vehicle> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val actionMessage: String? = null
)

class RideRequestsViewModel(application: Application) : AndroidViewModel(application) {
    private val rideRepository = RideRepository()

    private val _state = MutableStateFlow(RideRequestsState())
    val state: StateFlow<RideRequestsState> = _state.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            try {
                val ridesResult = rideRepository.getRideRequests()
                val driversResult = rideRepository.getDrivers()
                val vehiclesResult = rideRepository.getVehicles()

                _state.value = _state.value.copy(
                    rideRequests = ridesResult.getOrDefault(emptyList()),
                    drivers = driversResult.getOrDefault(emptyList()),
                    vehicles = vehiclesResult.getOrDefault(emptyList()),
                    isLoading = false
                )
            } catch (e: Exception) {
                _state.value = _state.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun approveRide(rideId: String) {
        viewModelScope.launch {
            val result = rideRepository.approveRideRequest(rideId)
            result.fold(
                onSuccess = {
                    _state.value = _state.value.copy(actionMessage = "Ride approved successfully")
                    loadData()
                },
                onFailure = {
                    _state.value = _state.value.copy(actionMessage = "Failed to approve ride: ${it.message}")
                }
            )
        }
    }

    fun assignRide(rideId: String, driverId: String, vehicleId: String) {
        viewModelScope.launch {
            val result = rideRepository.assignRideRequest(rideId, driverId, vehicleId, "15 mins")
            result.fold(
                onSuccess = {
                    _state.value = _state.value.copy(actionMessage = "Ride assigned successfully")
                    loadData()
                },
                onFailure = {
                    _state.value = _state.value.copy(actionMessage = "Failed to assign ride: ${it.message}")
                }
            )
        }
    }

    fun clearMessage() {
        _state.value = _state.value.copy(actionMessage = null)
    }
}

@Composable
fun RideRequestsScreen(
    viewModel: RideRequestsViewModel = viewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showAssignDialog by remember { mutableStateOf<RideRequest?>(null) }

    // Show snackbar for action messages
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(state.actionMessage) {
        state.actionMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearMessage()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Gray50)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Ride Requests",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Gray900
                    )
                    Text(
                        text = "${state.rideRequests.size} requests",
                        fontSize = 14.sp,
                        color = Gray500
                    )
                }
                IconButton(onClick = { viewModel.loadData() }) {
                    Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = Indigo600)
                }
            }

            if (state.isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Indigo600)
                }
            } else if (state.rideRequests.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.ListAlt,
                            contentDescription = null,
                            tint = Gray400,
                            modifier = Modifier.size(64.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("No ride requests", color = Gray500, fontSize = 16.sp)
                    }
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(state.rideRequests) { ride ->
                        RideRequestCard(
                            ride = ride,
                            onApprove = { viewModel.approveRide(ride.id) },
                            onAssign = { showAssignDialog = ride }
                        )
                    }
                }
            }
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }

    // Assign dialog
    showAssignDialog?.let { ride ->
        AssignDialog(
            ride = ride,
            drivers = state.drivers,
            vehicles = state.vehicles,
            onAssign = { driverId, vehicleId ->
                viewModel.assignRide(ride.id, driverId, vehicleId)
                showAssignDialog = null
            },
            onDismiss = { showAssignDialog = null }
        )
    }
}

@Composable
private fun RideRequestCard(
    ride: RideRequest,
    onApprove: () -> Unit,
    onAssign: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = ride.passenger?.name ?: "Unknown Passenger",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 15.sp,
                        color = Gray900
                    )
                    if (ride.department.isNotBlank()) {
                        Text(
                            text = ride.department,
                            fontSize = 12.sp,
                            color = Gray500
                        )
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (ride.priority != "normal") {
                        StatusBadge(status = ride.priority)
                    }
                    StatusBadge(status = ride.status)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.TripOrigin,
                    contentDescription = null,
                    tint = Green600,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = ride.pickupLocation?.address ?: "N/A",
                    fontSize = 13.sp,
                    color = Gray700
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = Red500,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = ride.dropoffLocation?.address ?: "N/A",
                    fontSize = 13.sp,
                    color = Gray700
                )
            }

            Spacer(modifier = Modifier.height(6.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.People, contentDescription = null, tint = Gray400, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("${ride.passengerCount}", fontSize = 12.sp, color = Gray500)
                }
                if (ride.pickupTime != null) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Schedule, contentDescription = null, tint = Gray400, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(ride.pickupTime.take(16).replace("T", " "), fontSize = 12.sp, color = Gray500)
                    }
                }
            }

            if (!ride.notes.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Note: ${ride.notes}",
                    fontSize = 12.sp,
                    color = Gray500,
                    fontWeight = FontWeight.Normal
                )
            }

            // Action buttons
            if (ride.status == "pending" || ride.status == "approved") {
                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = Gray200)
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (ride.status == "pending") {
                        OutlinedButton(
                            onClick = onApprove,
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Green600)
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Approve", fontSize = 13.sp)
                        }
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    if (ride.status == "pending" || ride.status == "approved") {
                        Button(
                            onClick = onAssign,
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
                        ) {
                            Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Assign", fontSize = 13.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AssignDialog(
    ride: RideRequest,
    drivers: List<Driver>,
    vehicles: List<Vehicle>,
    onAssign: (String, String) -> Unit,
    onDismiss: () -> Unit
) {
    var selectedDriverId by remember { mutableStateOf("") }
    var selectedVehicleId by remember { mutableStateOf("") }
    var expandedDriver by remember { mutableStateOf(false) }
    var expandedVehicle by remember { mutableStateOf(false) }

    val availableDrivers = drivers.filter { it.status == "available" || it.status == "on-duty" }
    val availableVehicles = vehicles.filter { it.status == "available" }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                "Assign Ride",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text(
                    text = "Passenger: ${ride.passenger?.name ?: "Unknown"}",
                    fontSize = 14.sp,
                    color = Gray600
                )

                // Driver dropdown
                ExposedDropdownMenuBox(
                    expanded = expandedDriver,
                    onExpandedChange = { expandedDriver = it }
                ) {
                    OutlinedTextField(
                        value = availableDrivers.find { it.id == selectedDriverId }?.name ?: "",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Select Driver") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedDriver) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(),
                        shape = RoundedCornerShape(8.dp)
                    )
                    ExposedDropdownMenu(
                        expanded = expandedDriver,
                        onDismissRequest = { expandedDriver = false }
                    ) {
                        availableDrivers.forEach { driver ->
                            DropdownMenuItem(
                                text = {
                                    Column {
                                        Text(driver.name, fontWeight = FontWeight.Medium)
                                        Text(driver.phone, fontSize = 12.sp, color = Gray500)
                                    }
                                },
                                onClick = {
                                    selectedDriverId = driver.id
                                    expandedDriver = false
                                }
                            )
                        }
                        if (availableDrivers.isEmpty()) {
                            DropdownMenuItem(
                                text = { Text("No available drivers", color = Gray400) },
                                onClick = {}
                            )
                        }
                    }
                }

                // Vehicle dropdown
                ExposedDropdownMenuBox(
                    expanded = expandedVehicle,
                    onExpandedChange = { expandedVehicle = it }
                ) {
                    OutlinedTextField(
                        value = availableVehicles.find { it.id == selectedVehicleId }?.let { "${it.name} (${it.plateNumber})" } ?: "",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Select Vehicle") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedVehicle) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(),
                        shape = RoundedCornerShape(8.dp)
                    )
                    ExposedDropdownMenu(
                        expanded = expandedVehicle,
                        onDismissRequest = { expandedVehicle = false }
                    ) {
                        availableVehicles.forEach { vehicle ->
                            DropdownMenuItem(
                                text = {
                                    Column {
                                        Text("${vehicle.name} (${vehicle.plateNumber})", fontWeight = FontWeight.Medium)
                                        Text("${vehicle.type} - ${vehicle.capacity} seats", fontSize = 12.sp, color = Gray500)
                                    }
                                },
                                onClick = {
                                    selectedVehicleId = vehicle.id
                                    expandedVehicle = false
                                }
                            )
                        }
                        if (availableVehicles.isEmpty()) {
                            DropdownMenuItem(
                                text = { Text("No available vehicles", color = Gray400) },
                                onClick = {}
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
                colors = ButtonDefaults.buttonColors(containerColor = Indigo600),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Assign")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = Gray500)
            }
        },
        shape = RoundedCornerShape(16.dp)
    )
}

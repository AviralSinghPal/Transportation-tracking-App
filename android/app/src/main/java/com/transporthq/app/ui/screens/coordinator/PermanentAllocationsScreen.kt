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
import com.transporthq.app.data.models.*
import com.transporthq.app.data.repository.DriverRepository
import com.transporthq.app.data.repository.PermanentTripRepository
import com.transporthq.app.data.repository.VehicleRepository
import com.transporthq.app.ui.components.StatusBadge
import com.transporthq.app.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class PermanentAllocationsState(
    val trips: List<PermanentTrip> = emptyList(),
    val drivers: List<Driver> = emptyList(),
    val vehicles: List<Vehicle> = emptyList(),
    val isLoading: Boolean = false,
    val actionMessage: String? = null
)

class PermanentAllocationsViewModel(application: Application) : AndroidViewModel(application) {
    private val ptRepo = PermanentTripRepository()
    private val driverRepo = DriverRepository()
    private val vehicleRepo = VehicleRepository()
    private val _state = MutableStateFlow(PermanentAllocationsState())
    val state: StateFlow<PermanentAllocationsState> = _state.asStateFlow()

    init { loadData() }

    fun loadData() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            _state.value = _state.value.copy(
                trips = ptRepo.getPermanentTrips().getOrDefault(emptyList()),
                drivers = driverRepo.getDrivers().getOrDefault(emptyList()),
                vehicles = vehicleRepo.getVehicles().getOrDefault(emptyList()),
                isLoading = false
            )
        }
    }

    fun createTrip(request: CreatePermanentTripRequest) {
        viewModelScope.launch {
            ptRepo.createPermanentTrip(request).fold(
                onSuccess = { msg("Allocation created"); loadData() },
                onFailure = { msg("Failed: ${it.message}") }
            )
        }
    }

    fun activate(id: String) { viewModelScope.launch { ptRepo.activate(id).fold({ msg("Activated"); loadData() }, { msg("Failed: ${it.message}") }) } }
    fun pause(id: String) { viewModelScope.launch { ptRepo.pause(id).fold({ msg("Paused"); loadData() }, { msg("Failed: ${it.message}") }) } }
    fun delete(id: String) { viewModelScope.launch { ptRepo.delete(id).fold({ msg("Deleted"); loadData() }, { msg("Failed: ${it.message}") }) } }

    fun swapDriver(id: String, driverId: String?, reason: String) {
        viewModelScope.launch { ptRepo.swapDriver(id, driverId, reason).fold({ msg("Driver swapped"); loadData() }, { msg("Failed: ${it.message}") }) }
    }

    fun swapVehicle(id: String, vehicleId: String?, reason: String) {
        viewModelScope.launch { ptRepo.swapVehicle(id, vehicleId, reason).fold({ msg("Vehicle swapped"); loadData() }, { msg("Failed: ${it.message}") }) }
    }

    private fun msg(m: String) { _state.value = _state.value.copy(actionMessage = m) }
    fun clearMessage() { _state.value = _state.value.copy(actionMessage = null) }
}

@Composable
fun PermanentAllocationsScreen(viewModel: PermanentAllocationsViewModel = viewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showCreateDialog by remember { mutableStateOf(false) }
    var showSwapDriverDialog by remember { mutableStateOf<PermanentTrip?>(null) }
    var showSwapVehicleDialog by remember { mutableStateOf<PermanentTrip?>(null) }
    var selectedTab by remember { mutableIntStateOf(0) }

    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(state.actionMessage) { state.actionMessage?.let { snackbarHostState.showSnackbar(it); viewModel.clearMessage() } }

    val tabs = listOf("All", "Active", "Draft", "Paused")
    val filtered = when (selectedTab) {
        1 -> state.trips.filter { it.status == "active" || it.status == "in_use" }
        2 -> state.trips.filter { it.status == "draft" }
        3 -> state.trips.filter { it.status == "paused" }
        else -> state.trips
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().background(Gray50)) {
            Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Permanent Allocations", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Gray900)
                Button(onClick = { showCreateDialog = true }, colors = ButtonDefaults.buttonColors(containerColor = Indigo600), shape = RoundedCornerShape(8.dp)) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("New", fontSize = 13.sp)
                }
            }

            // Stats
            Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                val active = state.trips.count { it.status == "active" || it.status == "in_use" }
                val drafts = state.trips.count { it.status == "draft" }
                val paused = state.trips.count { it.status == "paused" }
                StatCard(Modifier.weight(1f), "$active", "Active", Green600)
                StatCard(Modifier.weight(1f), "$drafts", "Drafts", Indigo600)
                StatCard(Modifier.weight(1f), "$paused", "Paused", Amber600)
            }

            Spacer(modifier = Modifier.height(8.dp))
            TabRow(selectedTabIndex = selectedTab, containerColor = White) {
                tabs.forEachIndexed { i, label -> Tab(selected = selectedTab == i, onClick = { selectedTab = i }, text = { Text(label, fontSize = 13.sp) }) }
            }

            if (state.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Indigo600) }
            } else {
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(filtered) { trip ->
                        PermanentTripCard(
                            trip = trip,
                            onActivate = { viewModel.activate(trip.id) },
                            onPause = { viewModel.pause(trip.id) },
                            onDelete = { viewModel.delete(trip.id) },
                            onSwapDriver = { showSwapDriverDialog = trip },
                            onSwapVehicle = { showSwapVehicleDialog = trip }
                        )
                    }
                    if (filtered.isEmpty()) {
                        item {
                            Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                                Text("No allocations found", color = Gray500)
                            }
                        }
                    }
                }
            }
        }
        SnackbarHost(hostState = snackbarHostState, modifier = Modifier.align(Alignment.BottomCenter))
    }

    if (showCreateDialog) {
        CreatePermanentTripDialog(
            onSubmit = { viewModel.createTrip(it); showCreateDialog = false },
            onDismiss = { showCreateDialog = false }
        )
    }

    showSwapDriverDialog?.let { trip ->
        SwapDialog(title = "Swap Driver", items = state.drivers.map { it.id to it.name },
            onSwap = { id, reason -> viewModel.swapDriver(trip.id, id, reason); showSwapDriverDialog = null },
            onDismiss = { showSwapDriverDialog = null })
    }

    showSwapVehicleDialog?.let { trip ->
        SwapDialog(title = "Swap Vehicle", items = state.vehicles.map { it.id to "${it.name} (${it.plateNumber})" },
            onSwap = { id, reason -> viewModel.swapVehicle(trip.id, id, reason); showSwapVehicleDialog = null },
            onDismiss = { showSwapVehicleDialog = null })
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
private fun PermanentTripCard(
    trip: PermanentTrip, onActivate: () -> Unit, onPause: () -> Unit,
    onDelete: () -> Unit, onSwapDriver: () -> Unit, onSwapVehicle: () -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = White), elevation = CardDefaults.cardElevation(2.dp)) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(trip.title, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Gray900)
                StatusBadge(status = trip.status)
            }
            Spacer(modifier = Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.TripOrigin, contentDescription = null, tint = Green600, modifier = Modifier.size(12.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(trip.pickupLocation, fontSize = 12.sp, color = Gray600)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.LocationOn, contentDescription = null, tint = Red500, modifier = Modifier.size(12.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(trip.dropoffLocation, fontSize = 12.sp, color = Gray600)
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text("${trip.scheduledTime} • ${trip.activeDays.joinToString(", ")}", fontSize = 11.sp, color = Gray400)
            if (trip.driver != null) Text("Driver: ${trip.driver.name}", fontSize = 11.sp, color = Gray500)
            if (trip.vehicle != null) Text("Vehicle: ${trip.vehicle.name}", fontSize = 11.sp, color = Gray500)
            Text("${trip.passengers.size} passengers • ${trip.startDate?.take(10) ?: ""} – ${trip.endDate?.take(10) ?: ""}", fontSize = 11.sp, color = Gray400)

            Spacer(modifier = Modifier.height(10.dp))
            Divider(color = Gray200)
            Spacer(modifier = Modifier.height(8.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                if (trip.status == "draft" || trip.status == "paused") {
                    SmallBtn("Activate", Green600) { onActivate() }
                }
                if (trip.status == "active" || trip.status == "in_use") {
                    SmallBtn("Pause", Amber600) { onPause() }
                }
                SmallBtn("Swap Driver", Indigo600) { onSwapDriver() }
                SmallBtn("Swap Vehicle", Indigo600) { onSwapVehicle() }
                IconButton(onClick = onDelete, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Default.Delete, tint = Red500, modifier = Modifier.size(16.dp), contentDescription = "Delete")
                }
            }
        }
    }
}

@Composable
private fun SmallBtn(label: String, color: androidx.compose.ui.graphics.Color, onClick: () -> Unit) {
    OutlinedButton(onClick = onClick, shape = RoundedCornerShape(6.dp), contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp), modifier = Modifier.height(28.dp),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = color)) {
        Text(label, fontSize = 10.sp)
    }
}

@Composable
private fun CreatePermanentTripDialog(onSubmit: (CreatePermanentTripRequest) -> Unit, onDismiss: () -> Unit) {
    var title by remember { mutableStateOf("") }
    var pickup by remember { mutableStateOf("") }
    var dropoff by remember { mutableStateOf("") }
    var time by remember { mutableStateOf("8:00 AM") }
    var startDate by remember { mutableStateOf("") }
    var endDate by remember { mutableStateOf("") }

    AlertDialog(onDismissRequest = onDismiss,
        title = { Text("New Allocation", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Title") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp))
                OutlinedTextField(value = pickup, onValueChange = { pickup = it }, label = { Text("Pickup") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp))
                OutlinedTextField(value = dropoff, onValueChange = { dropoff = it }, label = { Text("Dropoff") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp))
                OutlinedTextField(value = time, onValueChange = { time = it }, label = { Text("Time") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp))
                OutlinedTextField(value = startDate, onValueChange = { startDate = it }, label = { Text("Start Date (YYYY-MM-DD)") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp))
                OutlinedTextField(value = endDate, onValueChange = { endDate = it }, label = { Text("End Date (YYYY-MM-DD)") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp))
            }
        },
        confirmButton = {
            Button(onClick = { onSubmit(CreatePermanentTripRequest(title, pickup, dropoff, time, startDate, endDate)) },
                enabled = title.isNotBlank() && pickup.isNotBlank() && dropoff.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = Indigo600)) { Text("Create") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        shape = RoundedCornerShape(16.dp)
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SwapDialog(title: String, items: List<Pair<String, String>>, onSwap: (String?, String) -> Unit, onDismiss: () -> Unit) {
    var selectedId by remember { mutableStateOf("") }
    var reason by remember { mutableStateOf("") }
    var expanded by remember { mutableStateOf(false) }

    AlertDialog(onDismissRequest = onDismiss,
        title = { Text(title, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                    OutlinedTextField(value = items.find { it.first == selectedId }?.second ?: "", onValueChange = {}, readOnly = true,
                        label = { Text("Select") }, trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(), shape = RoundedCornerShape(8.dp))
                    ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        items.forEach { (id, name) -> DropdownMenuItem(text = { Text(name) }, onClick = { selectedId = id; expanded = false }) }
                    }
                }
                OutlinedTextField(value = reason, onValueChange = { reason = it }, label = { Text("Reason (optional)") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp))
            }
        },
        confirmButton = { Button(onClick = { onSwap(selectedId.ifBlank { null }, reason) }, colors = ButtonDefaults.buttonColors(containerColor = Indigo600)) { Text("Swap") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        shape = RoundedCornerShape(16.dp)
    )
}

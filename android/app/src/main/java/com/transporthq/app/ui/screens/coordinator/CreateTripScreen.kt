package com.transporthq.app.ui.screens.coordinator

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import com.transporthq.app.data.repository.TripRepository
import com.transporthq.app.data.repository.VehicleRepository
import com.transporthq.app.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

data class CreateTripState(
    val drivers: List<Driver> = emptyList(),
    val vehicles: List<Vehicle> = emptyList(),
    val isLoading: Boolean = false,
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val success: Boolean = false
)

class CreateTripViewModel(application: Application) : AndroidViewModel(application) {
    private val tripRepo = TripRepository()
    private val driverRepo = DriverRepository()
    private val vehicleRepo = VehicleRepository()
    private val _state = MutableStateFlow(CreateTripState())
    val state: StateFlow<CreateTripState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            val drivers = driverRepo.getAvailableDrivers().getOrDefault(emptyList())
            val vehicles = vehicleRepo.getVehicles().getOrDefault(emptyList())
            _state.value = _state.value.copy(drivers = drivers, vehicles = vehicles, isLoading = false)
        }
    }

    fun createTrip(
        title: String, pickup: String, dropoff: String,
        driverId: String?, vehicleId: String?, notes: String
    ) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isSubmitting = true, error = null)
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
            val result = tripRepo.createTrip(CreateTripRequest(
                title = title, date = today,
                driverId = driverId?.ifBlank { null },
                vehicleId = vehicleId?.ifBlank { null },
                pickupLocation = pickup, dropoffLocation = dropoff,
                notes = notes
            ))
            result.fold(
                onSuccess = { _state.value = _state.value.copy(isSubmitting = false, success = true) },
                onFailure = { _state.value = _state.value.copy(isSubmitting = false, error = it.message) }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateTripScreen(
    onBack: () -> Unit,
    viewModel: CreateTripViewModel = viewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    var title by remember { mutableStateOf("") }
    var pickup by remember { mutableStateOf("") }
    var dropoff by remember { mutableStateOf("") }
    var selectedDriverId by remember { mutableStateOf("") }
    var selectedVehicleId by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var expandedDriver by remember { mutableStateOf(false) }
    var expandedVehicle by remember { mutableStateOf(false) }

    LaunchedEffect(state.success) { if (state.success) onBack() }

    Column(modifier = Modifier.fillMaxSize().background(Gray50)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Gray900)
            }
            Text("Create Trip", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Gray900)
        }

        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            OutlinedTextField(
                value = title, onValueChange = { title = it },
                label = { Text("Trip Title") }, modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp)
            )
            OutlinedTextField(
                value = pickup, onValueChange = { pickup = it },
                label = { Text("Pickup Location") }, modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                leadingIcon = { Icon(Icons.Default.TripOrigin, contentDescription = null, tint = Green600, modifier = Modifier.size(18.dp)) }
            )
            OutlinedTextField(
                value = dropoff, onValueChange = { dropoff = it },
                label = { Text("Dropoff Location") }, modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                leadingIcon = { Icon(Icons.Default.LocationOn, contentDescription = null, tint = Red500, modifier = Modifier.size(18.dp)) }
            )

            // Driver dropdown
            ExposedDropdownMenuBox(expanded = expandedDriver, onExpandedChange = { expandedDriver = it }) {
                OutlinedTextField(
                    value = state.drivers.find { it.id == selectedDriverId }?.name ?: "",
                    onValueChange = {}, readOnly = true,
                    label = { Text("Driver (optional)") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedDriver) },
                    modifier = Modifier.fillMaxWidth().menuAnchor(), shape = RoundedCornerShape(8.dp)
                )
                ExposedDropdownMenu(expanded = expandedDriver, onDismissRequest = { expandedDriver = false }) {
                    DropdownMenuItem(text = { Text("None", color = Gray400) }, onClick = { selectedDriverId = ""; expandedDriver = false })
                    state.drivers.forEach { driver ->
                        DropdownMenuItem(
                            text = { Text(driver.name) },
                            onClick = { selectedDriverId = driver.id; expandedDriver = false }
                        )
                    }
                }
            }

            // Vehicle dropdown
            ExposedDropdownMenuBox(expanded = expandedVehicle, onExpandedChange = { expandedVehicle = it }) {
                OutlinedTextField(
                    value = state.vehicles.find { it.id == selectedVehicleId }?.let { "${it.name} (${it.plateNumber})" } ?: "",
                    onValueChange = {}, readOnly = true,
                    label = { Text("Vehicle (optional)") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedVehicle) },
                    modifier = Modifier.fillMaxWidth().menuAnchor(), shape = RoundedCornerShape(8.dp)
                )
                ExposedDropdownMenu(expanded = expandedVehicle, onDismissRequest = { expandedVehicle = false }) {
                    DropdownMenuItem(text = { Text("None", color = Gray400) }, onClick = { selectedVehicleId = ""; expandedVehicle = false })
                    state.vehicles.filter { it.status == "available" }.forEach { vehicle ->
                        DropdownMenuItem(
                            text = { Text("${vehicle.name} (${vehicle.plateNumber})") },
                            onClick = { selectedVehicleId = vehicle.id; expandedVehicle = false }
                        )
                    }
                }
            }

            OutlinedTextField(
                value = notes, onValueChange = { notes = it },
                label = { Text("Notes (optional)") }, modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp), minLines = 2, maxLines = 4
            )

            if (state.error != null) {
                Text(state.error!!, color = Red500, fontSize = 13.sp)
            }

            Button(
                onClick = { viewModel.createTrip(title, pickup, dropoff, selectedDriverId, selectedVehicleId, notes) },
                enabled = title.isNotBlank() && pickup.isNotBlank() && dropoff.isNotBlank() && !state.isSubmitting,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Indigo600),
                shape = RoundedCornerShape(8.dp)
            ) {
                if (state.isSubmitting) {
                    CircularProgressIndicator(color = White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                } else {
                    Text("Create Trip", fontWeight = FontWeight.SemiBold)
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

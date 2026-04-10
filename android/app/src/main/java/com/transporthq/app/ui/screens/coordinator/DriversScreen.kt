package com.transporthq.app.ui.screens.coordinator

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
import com.transporthq.app.data.models.Driver
import com.transporthq.app.data.repository.DriverRepository
import com.transporthq.app.ui.components.StatusBadge
import com.transporthq.app.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DriversState(
    val drivers: List<Driver> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val actionMessage: String? = null
)

class DriversViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = DriverRepository()
    private val _state = MutableStateFlow(DriversState())
    val state: StateFlow<DriversState> = _state.asStateFlow()

    init { loadDrivers() }

    fun loadDrivers() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            val result = repository.getDrivers()
            result.fold(
                onSuccess = { _state.value = _state.value.copy(drivers = it, isLoading = false) },
                onFailure = { _state.value = _state.value.copy(isLoading = false, error = it.message) }
            )
        }
    }

    fun toggleAvailability(driver: Driver) {
        viewModelScope.launch {
            val newAvailability = !driver.isAvailable
            val result = repository.toggleAvailability(driver.id, newAvailability)
            result.fold(
                onSuccess = {
                    _state.value = _state.value.copy(
                        actionMessage = if (newAvailability) "${driver.name} set available" else "${driver.name} set unavailable"
                    )
                    loadDrivers()
                },
                onFailure = { _state.value = _state.value.copy(actionMessage = "Failed: ${it.message}") }
            )
        }
    }

    fun createTempDriver(name: String, phone: String, licenseNumber: String?) {
        viewModelScope.launch {
            val result = repository.createTempDriver(name, phone, licenseNumber)
            result.fold(
                onSuccess = { _state.value = _state.value.copy(actionMessage = "Temp driver created"); loadDrivers() },
                onFailure = { _state.value = _state.value.copy(actionMessage = "Failed: ${it.message}") }
            )
        }
    }

    fun clearMessage() { _state.value = _state.value.copy(actionMessage = null) }
}

@Composable
fun DriversScreen(viewModel: DriversViewModel = viewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showTempDriverDialog by remember { mutableStateOf(false) }

    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(state.actionMessage) {
        state.actionMessage?.let { snackbarHostState.showSnackbar(it); viewModel.clearMessage() }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().background(Gray50)) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Drivers", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Gray900)
                    Text("${state.drivers.size} drivers", fontSize = 14.sp, color = Gray500)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    IconButton(onClick = { viewModel.loadDrivers() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = Indigo600)
                    }
                    Button(
                        onClick = { showTempDriverDialog = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Indigo600),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Add Driver", fontSize = 13.sp)
                    }
                }
            }

            // Stats
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                val total = state.drivers.size
                val available = state.drivers.count { it.isAvailable }
                val unavailable = total - available
                StatCard(Modifier.weight(1f), "$total", "Total", Gray600)
                StatCard(Modifier.weight(1f), "$available", "Available", Green600)
                StatCard(Modifier.weight(1f), "$unavailable", "Unavailable", Red500)
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
                    items(state.drivers) { driver ->
                        DriverCard(
                            driver = driver,
                            onToggleAvailability = { viewModel.toggleAvailability(driver) }
                        )
                    }
                }
            }
        }
        SnackbarHost(hostState = snackbarHostState, modifier = Modifier.align(Alignment.BottomCenter))
    }

    if (showTempDriverDialog) {
        TempDriverDialog(
            onSubmit = { name, phone, license ->
                viewModel.createTempDriver(name, phone, license)
                showTempDriverDialog = false
            },
            onDismiss = { showTempDriverDialog = false }
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
private fun DriverCard(driver: Driver, onToggleAvailability: () -> Unit) {
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
                Box(
                    modifier = Modifier.size(40.dp).clip(CircleShape).background(Indigo100),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        driver.name.firstOrNull()?.uppercase() ?: "?",
                        fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Indigo600
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    if (driver.isPermanentlyAllocated) {
                        StatusBadge(status = "PA: Assigned")
                    }
                    StatusBadge(status = if (driver.isAvailable) "on-duty" else "off-duty")
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            Text(driver.name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Gray900)

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Phone, contentDescription = null, tint = Gray400, modifier = Modifier.size(12.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(driver.phone, fontSize = 11.sp, color = Gray500)
            }

            if (!driver.licenseNumber.isNullOrBlank()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Badge, contentDescription = null, tint = Gray400, modifier = Modifier.size(12.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(driver.licenseNumber, fontSize = 11.sp, color = Gray500)
                }
            }

            if (!driver.licenseExpiry.isNullOrBlank()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CalendarMonth, contentDescription = null, tint = Gray400, modifier = Modifier.size(12.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Expires ${driver.licenseExpiry.take(10)}", fontSize = 11.sp, color = Gray500)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            Divider(color = Gray200)
            Spacer(modifier = Modifier.height(8.dp))

            Button(
                onClick = onToggleAvailability,
                shape = RoundedCornerShape(6.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (driver.isAvailable) Red500.copy(alpha = 0.1f) else Green600.copy(alpha = 0.1f)
                ),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    if (driver.isAvailable) "Set Unavailable" else "Set Available",
                    fontSize = 12.sp,
                    color = if (driver.isAvailable) Red500 else Green600,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
private fun TempDriverDialog(
    onSubmit: (String, String, String?) -> Unit,
    onDismiss: () -> Unit
) {
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var licenseNumber by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Temporary Driver", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name, onValueChange = { name = it },
                    label = { Text("Driver Name") }, modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )
                OutlinedTextField(
                    value = phone, onValueChange = { phone = it },
                    label = { Text("Phone Number") }, modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )
                OutlinedTextField(
                    value = licenseNumber, onValueChange = { licenseNumber = it },
                    label = { Text("License Number (optional)") }, modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onSubmit(name, phone, licenseNumber.ifBlank { null }) },
                enabled = name.isNotBlank() && phone.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = Indigo600),
                shape = RoundedCornerShape(8.dp)
            ) { Text("Add") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel", color = Gray500) } },
        shape = RoundedCornerShape(16.dp)
    )
}

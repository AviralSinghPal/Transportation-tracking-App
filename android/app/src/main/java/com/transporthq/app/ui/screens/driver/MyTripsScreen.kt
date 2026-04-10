package com.transporthq.app.ui.screens.driver

import android.Manifest
import android.app.Application
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.animateColorAsState
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.transporthq.app.data.models.Trip
import com.transporthq.app.data.repository.TripRepository
import com.transporthq.app.services.LocationService
import com.transporthq.app.ui.components.StatusBadge
import com.transporthq.app.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DriverTripsState(
    val trips: List<Trip> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val isLocationSharing: Boolean = false,
    val actionMessage: String? = null
)

class MyTripsViewModel(application: Application) : AndroidViewModel(application) {
    private val tripRepository = TripRepository()

    private val _state = MutableStateFlow(DriverTripsState())
    val state: StateFlow<DriverTripsState> = _state.asStateFlow()

    init {
        loadTrips()
    }

    fun loadTrips() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            val result = tripRepository.getTrips()
            result.fold(
                onSuccess = { trips ->
                    val hasActiveTrip = trips.any { it.status in listOf("driver-departed", "arrived-pickup", "in-progress") }
                    _state.value = _state.value.copy(
                        trips = trips,
                        isLoading = false,
                        isLocationSharing = hasActiveTrip
                    )
                },
                onFailure = { error ->
                    _state.value = _state.value.copy(isLoading = false, error = error.message)
                }
            )
        }
    }

    fun updateTripStatus(tripId: String, newStatus: String) {
        viewModelScope.launch {
            val result = tripRepository.updateTripStatus(tripId, newStatus)
            result.fold(
                onSuccess = {
                    _state.value = _state.value.copy(actionMessage = "Status updated to ${newStatus.replace("-", " ")}")
                    loadTrips()
                },
                onFailure = {
                    _state.value = _state.value.copy(actionMessage = "Failed to update status: ${it.message}")
                }
            )
        }
    }

    fun clearMessage() {
        _state.value = _state.value.copy(actionMessage = null)
    }
}

private val statusFlow = listOf("assigned", "driver-departed", "arrived-pickup", "in-progress", "completed")

private fun getNextStatus(currentStatus: String): String? {
    val index = statusFlow.indexOf(currentStatus)
    return if (index >= 0 && index < statusFlow.size - 1) statusFlow[index + 1] else null
}

private fun getNextStatusLabel(currentStatus: String): String {
    return when (getNextStatus(currentStatus)) {
        "driver-departed" -> "I'm Departing Now"
        "arrived-pickup" -> "I've Arrived at Pickup"
        "in-progress" -> "Passenger Picked Up"
        "completed" -> "Arrived at Destination"
        else -> ""
    }
}

@Composable
fun DriverMyTripsScreen(
    viewModel: MyTripsViewModel = viewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }

    // Location permission
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineLocation = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        if (fineLocation) {
            val intent = Intent(context, LocationService::class.java)
            ContextCompat.startForegroundService(context, intent)
        }
    }

    // Start location service when there's an active trip
    LaunchedEffect(state.isLocationSharing) {
        if (state.isLocationSharing) {
            val hasPermission = ContextCompat.checkSelfPermission(
                context, Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED

            if (hasPermission) {
                val intent = Intent(context, LocationService::class.java)
                ContextCompat.startForegroundService(context, intent)
            } else {
                locationPermissionLauncher.launch(
                    arrayOf(
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    )
                )
            }
        } else {
            val intent = Intent(context, LocationService::class.java)
            context.stopService(intent)
        }
    }

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
            // GPS indicator
            if (state.isLocationSharing) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Green50)
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(Green500)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "GPS location sharing active",
                        fontSize = 13.sp,
                        color = Green700,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.weight(1f))
                    Icon(
                        Icons.Default.GpsFixed,
                        contentDescription = null,
                        tint = Green600,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "My Trips",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Gray900
                    )
                    Text(
                        text = "${state.trips.size} trips assigned",
                        fontSize = 14.sp,
                        color = Gray500
                    )
                }
                IconButton(onClick = { viewModel.loadTrips() }) {
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
            } else if (state.trips.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.DirectionsCar,
                            contentDescription = null,
                            tint = Gray400,
                            modifier = Modifier.size(64.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("No trips assigned", color = Gray500, fontSize = 16.sp)
                    }
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(state.trips) { trip ->
                        DriverTripCard(
                            trip = trip,
                            onUpdateStatus = { newStatus ->
                                viewModel.updateTripStatus(trip.id, newStatus)
                            }
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
}

@Composable
private fun DriverTripCard(
    trip: Trip,
    onUpdateStatus: (String) -> Unit
) {
    val context = LocalContext.current
    val nextStatus = getNextStatus(trip.status)
    val nextLabel = getNextStatusLabel(trip.status)
    val isActive = trip.status in listOf("driver-departed", "arrived-pickup", "in-progress")

    val borderColor by animateColorAsState(
        targetValue = if (isActive) Indigo500 else Gray200,
        label = "borderColor"
    )

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = White),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isActive) 4.dp else 2.dp),
        border = if (isActive) CardDefaults.outlinedCardBorder().copy(
            brush = androidx.compose.ui.graphics.SolidColor(Indigo500)
        ) else null
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Status and active indicator
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (isActive) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(Green500)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Active Trip", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Green600)
                    }
                } else {
                    Spacer(modifier = Modifier.width(1.dp))
                }
                StatusBadge(status = trip.status)
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Passenger info
            if (trip.rideRequest?.passenger != null) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .background(Indigo50, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = null,
                            tint = Indigo600,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = trip.rideRequest.passenger.name,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                            color = Gray900
                        )
                        Text(
                            text = "${trip.rideRequest.passengerCount} passenger(s)",
                            fontSize = 12.sp,
                            color = Gray500
                        )
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            // Locations
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.TripOrigin, contentDescription = null, tint = Green600, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = trip.displayPickup,
                    fontSize = 13.sp,
                    color = Gray700
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.LocationOn, contentDescription = null, tint = Red500, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = trip.displayDropoff,
                    fontSize = 13.sp,
                    color = Gray700
                )
            }

            // Navigate buttons
            if (isActive) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    val pickupAddr = trip.displayPickup.takeIf { it != "N/A" } ?: ""
                    val dropoffAddr = trip.displayDropoff.takeIf { it != "N/A" } ?: ""
                    if (pickupAddr.isNotBlank() && trip.status in listOf("assigned", "driver-departed")) {
                        OutlinedButton(
                            onClick = {
                                val uri = Uri.parse("google.navigation:q=${Uri.encode(pickupAddr)}")
                                context.startActivity(Intent(Intent.ACTION_VIEW, uri).setPackage("com.google.android.apps.maps"))
                            },
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Navigation, contentDescription = null, modifier = Modifier.size(14.dp), tint = Green600)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Navigate to Pickup", fontSize = 11.sp, color = Green600)
                        }
                    }
                    if (dropoffAddr.isNotBlank() && trip.status in listOf("arrived-pickup", "in-progress")) {
                        OutlinedButton(
                            onClick = {
                                val uri = Uri.parse("google.navigation:q=${Uri.encode(dropoffAddr)}")
                                context.startActivity(Intent(Intent.ACTION_VIEW, uri).setPackage("com.google.android.apps.maps"))
                            },
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Navigation, contentDescription = null, modifier = Modifier.size(14.dp), tint = Red500)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Navigate to Dropoff", fontSize = 11.sp, color = Red500)
                        }
                    }
                }
            }

            // Vehicle
            if (trip.vehicle != null) {
                Spacer(modifier = Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.DirectionsCar, contentDescription = null, tint = Gray400, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "${trip.vehicle.name} (${trip.vehicle.plateNumber})",
                        fontSize = 12.sp,
                        color = Gray500
                    )
                }
            }

            // Notes
            if (!trip.rideRequest?.notes.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Note: ${trip.rideRequest?.notes}",
                    fontSize = 12.sp,
                    color = Gray500
                )
            }

            // Status update button
            if (nextStatus != null && trip.status != "completed") {
                Spacer(modifier = Modifier.height(14.dp))
                Divider(color = Gray200)
                Spacer(modifier = Modifier.height(14.dp))

                Button(
                    onClick = { onUpdateStatus(nextStatus) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = when (nextStatus) {
                            "completed" -> Green600
                            "in-progress" -> Indigo600
                            else -> Blue600
                        }
                    )
                ) {
                    Icon(
                        imageVector = when (nextStatus) {
                            "driver-departed" -> Icons.Default.DirectionsCar
                            "arrived-pickup" -> Icons.Default.Place
                            "in-progress" -> Icons.Default.PlayArrow
                            "completed" -> Icons.Default.CheckCircle
                            else -> Icons.Default.ArrowForward
                        },
                        contentDescription = null,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = nextLabel,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            // Status progress
            if (trip.status != "completed" && trip.status != "cancelled") {
                Spacer(modifier = Modifier.height(12.dp))
                StatusProgressBar(currentStatus = trip.status)
            }
        }
    }
}

@Composable
private fun StatusProgressBar(currentStatus: String) {
    val steps = statusFlow
    val currentIndex = steps.indexOf(currentStatus).coerceAtLeast(0)

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        steps.forEachIndexed { index, step ->
            val isCompleted = index <= currentIndex
            val isCurrent = index == currentIndex

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(if (isCurrent) 12.dp else 8.dp)
                        .clip(CircleShape)
                        .background(
                            when {
                                isCompleted -> Indigo600
                                else -> Gray300
                            }
                        )
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = when (step) {
                        "assigned" -> "Assigned"
                        "driver-departed" -> "Departed"
                        "arrived-pickup" -> "At Pickup"
                        "in-progress" -> "In Progress"
                        "completed" -> "Done"
                        else -> step
                    },
                    fontSize = 8.sp,
                    color = if (isCompleted) Indigo600 else Gray400,
                    fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
                    maxLines = 1
                )
            }
        }
    }
}

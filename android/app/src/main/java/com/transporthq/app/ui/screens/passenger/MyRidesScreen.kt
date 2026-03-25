package com.transporthq.app.ui.screens.passenger

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
import com.transporthq.app.data.models.CreateRideRequest
import com.transporthq.app.data.models.LocationInfo
import com.transporthq.app.data.models.RideRequest
import com.transporthq.app.data.repository.RideRepository
import com.transporthq.app.ui.components.StatusBadge
import com.transporthq.app.ui.screens.common.RideRequestDialog
import com.transporthq.app.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class PassengerRidesState(
    val rides: List<RideRequest> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val actionMessage: String? = null
)

class MyRidesViewModel(application: Application) : AndroidViewModel(application) {
    private val rideRepository = RideRepository()

    private val _state = MutableStateFlow(PassengerRidesState())
    val state: StateFlow<PassengerRidesState> = _state.asStateFlow()

    init {
        loadRides()
    }

    fun loadRides() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            val result = rideRepository.getRideRequests()
            result.fold(
                onSuccess = { rides ->
                    _state.value = _state.value.copy(rides = rides, isLoading = false)
                },
                onFailure = { error ->
                    _state.value = _state.value.copy(isLoading = false, error = error.message)
                }
            )
        }
    }

    fun createRideRequest(request: CreateRideRequest) {
        viewModelScope.launch {
            val result = rideRepository.createRideRequest(request)
            result.fold(
                onSuccess = {
                    _state.value = _state.value.copy(actionMessage = "Ride request created successfully")
                    loadRides()
                },
                onFailure = {
                    _state.value = _state.value.copy(actionMessage = "Failed: ${it.message}")
                }
            )
        }
    }

    fun clearMessage() {
        _state.value = _state.value.copy(actionMessage = null)
    }
}

@Composable
fun PassengerMyRidesScreen(
    onTrackDriver: (String) -> Unit,
    viewModel: MyRidesViewModel = viewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showCreateDialog by remember { mutableStateOf(false) }
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
                        text = "My Rides",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Gray900
                    )
                    Text(
                        text = "${state.rides.size} ride requests",
                        fontSize = 14.sp,
                        color = Gray500
                    )
                }
                Row {
                    IconButton(onClick = { viewModel.loadRides() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = Indigo600)
                    }
                    Button(
                        onClick = { showCreateDialog = true },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Indigo600),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("New Ride", fontSize = 13.sp)
                    }
                }
            }

            if (state.isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Indigo600)
                }
            } else if (state.rides.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.ListAlt, contentDescription = null, tint = Gray400, modifier = Modifier.size(64.dp))
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("No ride requests yet", color = Gray500, fontSize = 16.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(
                            onClick = { showCreateDialog = true },
                            colors = ButtonDefaults.buttonColors(containerColor = Indigo600),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Request a Ride")
                        }
                    }
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(state.rides) { ride ->
                        PassengerRideCard(
                            ride = ride,
                            onTrackDriver = { onTrackDriver(ride.id) }
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

    if (showCreateDialog) {
        RideRequestDialog(
            onDismiss = { showCreateDialog = false },
            onSubmit = { request ->
                viewModel.createRideRequest(request)
                showCreateDialog = false
            }
        )
    }
}

@Composable
private fun PassengerRideCard(
    ride: RideRequest,
    onTrackDriver: () -> Unit
) {
    val canTrack = ride.status in listOf("assigned", "driver-departed", "arrived-pickup", "in-progress") && ride.assignedDriver != null

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
                    if (ride.assignedDriver != null) {
                        Text(
                            text = "Driver: ${ride.assignedDriver.name}",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                            color = Gray900
                        )
                    } else {
                        Text(
                            text = "Awaiting driver assignment",
                            fontWeight = FontWeight.Medium,
                            fontSize = 14.sp,
                            color = Gray500
                        )
                    }
                }
                StatusBadge(status = ride.status)
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.TripOrigin, contentDescription = null, tint = Green600, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(text = ride.pickupLocation?.address ?: "N/A", fontSize = 13.sp, color = Gray700)
            }
            Spacer(modifier = Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.LocationOn, contentDescription = null, tint = Red500, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(text = ride.dropoffLocation?.address ?: "N/A", fontSize = 13.sp, color = Gray700)
            }

            Spacer(modifier = Modifier.height(6.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.People, contentDescription = null, tint = Gray400, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("${ride.passengerCount}", fontSize = 12.sp, color = Gray500)
                }
                if (ride.eta != null) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Timer, contentDescription = null, tint = Gray400, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("ETA: ${ride.eta}", fontSize = 12.sp, color = Gray500)
                    }
                }
            }

            if (canTrack) {
                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = Gray200)
                Spacer(modifier = Modifier.height(12.dp))
                Button(
                    onClick = onTrackDriver,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
                ) {
                    Icon(
                        Icons.Default.GpsFixed,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "Track Driver Live",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}

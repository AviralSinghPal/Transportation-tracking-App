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
import com.transporthq.app.data.models.Trip
import com.transporthq.app.data.repository.TripRepository
import com.transporthq.app.ui.components.StatusBadge
import com.transporthq.app.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class PassengerTripsState(
    val trips: List<Trip> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

class PassengerTripsViewModel(application: Application) : AndroidViewModel(application) {
    private val tripRepository = TripRepository()

    private val _state = MutableStateFlow(PassengerTripsState())
    val state: StateFlow<PassengerTripsState> = _state.asStateFlow()

    init {
        loadTrips()
    }

    fun loadTrips() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            val result = tripRepository.getTrips()
            result.fold(
                onSuccess = { trips ->
                    _state.value = _state.value.copy(trips = trips, isLoading = false)
                },
                onFailure = { error ->
                    _state.value = _state.value.copy(isLoading = false, error = error.message)
                }
            )
        }
    }
}

@Composable
fun PassengerMyTripsScreen(
    viewModel: PassengerTripsViewModel = viewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

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
                    text = "My Trips",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = Gray900
                )
                Text(
                    text = "${state.trips.size} trips",
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
                    Icon(Icons.Default.DirectionsCar, contentDescription = null, tint = Gray400, modifier = Modifier.size(64.dp))
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("No trips yet", color = Gray500, fontSize = 16.sp)
                    Text("Request a ride to get started", color = Gray400, fontSize = 13.sp)
                }
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(state.trips) { trip ->
                    PassengerTripCard(trip)
                }
            }
        }
    }
}

@Composable
private fun PassengerTripCard(trip: Trip) {
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
                Column {
                    if (trip.driver != null) {
                        Text(
                            text = "Driver: ${trip.driver.name}",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                            color = Gray900
                        )
                        Text(
                            text = trip.driver.phone,
                            fontSize = 12.sp,
                            color = Gray500
                        )
                    } else {
                        Text(
                            text = "Driver not assigned",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                            color = Gray500
                        )
                    }
                }
                StatusBadge(status = trip.status)
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.TripOrigin, contentDescription = null, tint = Green600, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = trip.pickupLocation?.address ?: trip.rideRequest?.pickupLocation?.address ?: "N/A",
                    fontSize = 13.sp,
                    color = Gray700
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.LocationOn, contentDescription = null, tint = Red500, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = trip.dropoffLocation?.address ?: trip.rideRequest?.dropoffLocation?.address ?: "N/A",
                    fontSize = 13.sp,
                    color = Gray700
                )
            }

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
        }
    }
}

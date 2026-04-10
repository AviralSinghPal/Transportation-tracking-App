package com.transporthq.app.ui.screens.coordinator

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
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
import java.time.LocalDate
import java.time.format.DateTimeFormatter

data class CoordinatorTripsState(
    val allTrips: List<Trip> = emptyList(),
    val trips: List<Trip> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val selectedDate: String = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE),
    val selectedFilter: String = "all"
)

class CoordinatorTripsViewModel(application: Application) : AndroidViewModel(application) {
    private val tripRepository = TripRepository()

    private val _state = MutableStateFlow(CoordinatorTripsState())
    val state: StateFlow<CoordinatorTripsState> = _state.asStateFlow()

    init {
        loadTrips()
    }

    fun loadTrips() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            val result = tripRepository.getTrips(_state.value.selectedDate)
            result.fold(
                onSuccess = { trips ->
                    _state.value = _state.value.copy(allTrips = trips, trips = trips, isLoading = false)
                },
                onFailure = { error ->
                    _state.value = _state.value.copy(isLoading = false, error = error.message)
                }
            )
        }
    }

    fun setFilter(filter: String) {
        val allTrips = _state.value.allTrips
        val filtered = when (filter) {
            "unassigned" -> allTrips.filter { it.status == "unassigned" }
            "assigned" -> allTrips.filter { it.status == "assigned" }
            "in-progress" -> allTrips.filter { it.status in listOf("driver-departed", "arrived-pickup", "in-progress") }
            "completed" -> allTrips.filter { it.status == "completed" }
            else -> allTrips
        }
        _state.value = _state.value.copy(trips = filtered, selectedFilter = filter)
    }
}

@Composable
fun TripsScreen(
    viewModel: CoordinatorTripsViewModel = viewModel(),
    onCreateTrip: (() -> Unit)? = null,
    onTripClick: ((String) -> Unit)? = null
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Gray50)
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "All Trips",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = Gray900
                )
                Text(
                    text = "${state.trips.size} of ${state.allTrips.size} trips today",
                    fontSize = 14.sp,
                    color = Gray500
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                IconButton(onClick = { viewModel.loadTrips() }) {
                    Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = Indigo600)
                }
                if (onCreateTrip != null) {
                    Button(
                        onClick = onCreateTrip,
                        colors = ButtonDefaults.buttonColors(containerColor = Indigo600),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("New Trip", fontSize = 13.sp)
                    }
                }
            }
        }

        // Filter chips
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf("all" to "All", "unassigned" to "Unassigned", "assigned" to "Assigned", "in-progress" to "In Progress", "completed" to "Completed").forEach { (value, label) ->
                FilterChip(
                    selected = state.selectedFilter == value,
                    onClick = { viewModel.setFilter(value) },
                    label = { Text(label, fontSize = 13.sp) },
                    shape = RoundedCornerShape(20.dp),
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Indigo600,
                        selectedLabelColor = White
                    )
                )
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
                    Text("No trips found", color = Gray500, fontSize = 16.sp)
                }
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(state.trips) { trip ->
                    CoordinatorTripCard(
                        trip = trip,
                        onClick = { onTripClick?.invoke(trip.id) }
                    )
                }
            }
        }
    }
}

@Composable
private fun CoordinatorTripCard(trip: Trip, onClick: () -> Unit = {}) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
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
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .background(Indigo50, RoundedCornerShape(10.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.DirectionsCar,
                            contentDescription = null,
                            tint = Indigo600,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = trip.driver?.name ?: "No Driver",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                            color = Gray900
                        )
                        Text(
                            text = trip.vehicle?.let { "${it.name} - ${it.plateNumber}" } ?: "No Vehicle",
                            fontSize = 12.sp,
                            color = Gray500
                        )
                    }
                }
                StatusBadge(status = trip.status)
            }

            Spacer(modifier = Modifier.height(12.dp))
            Divider(color = Gray200)
            Spacer(modifier = Modifier.height(12.dp))

            Row(verticalAlignment = Alignment.Top) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.TripOrigin,
                            contentDescription = null,
                            tint = Green600,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = trip.displayPickup,
                            fontSize = 13.sp,
                            color = Gray700,
                            maxLines = 2
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = Red500,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = trip.displayDropoff,
                            fontSize = 13.sp,
                            color = Gray700,
                            maxLines = 2
                        )
                    }
                }
            }

            if (trip.rideRequest?.passenger != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Person,
                        contentDescription = null,
                        tint = Gray400,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = trip.rideRequest.passenger.name,
                        fontSize = 12.sp,
                        color = Gray500
                    )
                }
            }
        }
    }
}

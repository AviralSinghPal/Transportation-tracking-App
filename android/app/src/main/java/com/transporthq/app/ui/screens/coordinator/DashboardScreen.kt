package com.transporthq.app.ui.screens.coordinator

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.transporthq.app.data.models.RideRequest
import com.transporthq.app.data.models.Trip
import com.transporthq.app.data.repository.RideRepository
import com.transporthq.app.data.repository.TripRepository
import com.transporthq.app.ui.components.StatusBadge
import com.transporthq.app.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

data class DashboardState(
    val trips: List<Trip> = emptyList(),
    val rideRequests: List<RideRequest> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

class DashboardViewModel(application: Application) : AndroidViewModel(application) {
    private val tripRepository = TripRepository()
    private val rideRepository = RideRepository()

    private val _state = MutableStateFlow(DashboardState())
    val state: StateFlow<DashboardState> = _state.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            try {
                val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
                val tripsResult = tripRepository.getTrips(today)
                val ridesResult = rideRepository.getRideRequests()

                _state.value = _state.value.copy(
                    trips = tripsResult.getOrDefault(emptyList()),
                    rideRequests = ridesResult.getOrDefault(emptyList()),
                    isLoading = false
                )
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    isLoading = false,
                    error = e.message
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel = viewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    val activeTrips = state.trips.count { it.status in listOf("assigned", "driver-departed", "arrived-pickup", "in-progress") }
    val completedTrips = state.trips.count { it.status == "completed" }
    val pendingRides = state.rideRequests.count { it.status == "pending" }
    val totalTrips = state.trips.size

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Gray50),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(
                text = "Today's Overview",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = Gray900,
                modifier = Modifier.padding(bottom = 4.dp)
            )
            Text(
                text = LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy")),
                fontSize = 14.sp,
                color = Gray500
            )
        }

        // Stats cards
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                StatCard(
                    title = "Total Trips",
                    value = totalTrips.toString(),
                    icon = Icons.Default.DirectionsCar,
                    color = Indigo600,
                    bgColor = Indigo50,
                    modifier = Modifier.weight(1f)
                )
                StatCard(
                    title = "Active",
                    value = activeTrips.toString(),
                    icon = Icons.Default.PlayArrow,
                    color = Green600,
                    bgColor = Green50,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                StatCard(
                    title = "Completed",
                    value = completedTrips.toString(),
                    icon = Icons.Default.CheckCircle,
                    color = Green600,
                    bgColor = Green50,
                    modifier = Modifier.weight(1f)
                )
                StatCard(
                    title = "Pending Rides",
                    value = pendingRides.toString(),
                    icon = Icons.Default.Pending,
                    color = Amber600,
                    bgColor = Amber50,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Recent trips
        item {
            Text(
                text = "Recent Trips",
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold,
                color = Gray900,
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        if (state.isLoading) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Indigo600)
                }
            }
        } else if (state.trips.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = White)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Default.DirectionsCar,
                                contentDescription = null,
                                tint = Gray400,
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("No trips today", color = Gray500, fontSize = 14.sp)
                        }
                    }
                }
            }
        } else {
            val recentTrips = state.trips.take(5)
            items(recentTrips.size) { index ->
                val trip = recentTrips[index]
                TripSummaryCard(trip)
            }
        }

        // Pending ride requests
        if (pendingRides > 0) {
            item {
                Text(
                    text = "Pending Ride Requests",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Gray900,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }

            val pendingList = state.rideRequests.filter { it.status == "pending" }.take(5)
            items(pendingList.size) { index ->
                val ride = pendingList[index]
                PendingRideCard(ride)
            }
        }
    }
}

@Composable
private fun StatCard(
    title: String,
    value: String,
    icon: ImageVector,
    color: Color,
    bgColor: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(bgColor, RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = value,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Gray900
                )
                Text(
                    text = title,
                    fontSize = 12.sp,
                    color = Gray500
                )
            }
        }
    }
}

@Composable
private fun TripSummaryCard(trip: Trip) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = trip.driver?.name ?: "Unassigned",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    color = Gray900
                )
                StatusBadge(status = trip.status)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = Green600,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = trip.pickupLocation?.address ?: trip.rideRequest?.pickupLocation?.address ?: "N/A",
                    fontSize = 13.sp,
                    color = Gray600
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Flag,
                    contentDescription = null,
                    tint = Red500,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = trip.dropoffLocation?.address ?: trip.rideRequest?.dropoffLocation?.address ?: "N/A",
                    fontSize = 13.sp,
                    color = Gray600
                )
            }
            if (trip.vehicle != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.DirectionsCar,
                        contentDescription = null,
                        tint = Indigo600,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${trip.vehicle.name} (${trip.vehicle.plateNumber})",
                        fontSize = 13.sp,
                        color = Gray600
                    )
                }
            }
        }
    }
}

@Composable
private fun PendingRideCard(ride: RideRequest) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = ride.passenger?.name ?: "Unknown Passenger",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    color = Gray900
                )
                StatusBadge(status = ride.status)
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "From: ${ride.pickupLocation?.address ?: "N/A"}",
                fontSize = 13.sp,
                color = Gray600
            )
            Text(
                text = "To: ${ride.dropoffLocation?.address ?: "N/A"}",
                fontSize = 13.sp,
                color = Gray600
            )
            if (ride.priority != "normal") {
                Spacer(modifier = Modifier.height(4.dp))
                StatusBadge(status = ride.priority)
            }
        }
    }
}

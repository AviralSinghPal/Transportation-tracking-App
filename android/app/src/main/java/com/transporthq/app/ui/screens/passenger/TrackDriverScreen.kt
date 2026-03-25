package com.transporthq.app.ui.screens.passenger

import android.app.Application
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*
import com.transporthq.app.data.api.SocketManager
import com.transporthq.app.data.models.DriverLocation
import com.transporthq.app.data.models.RideRequest
import com.transporthq.app.data.repository.RideRepository
import com.transporthq.app.ui.components.StatusBadge
import com.transporthq.app.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class TrackDriverState(
    val rideRequest: RideRequest? = null,
    val driverLocation: DriverLocation? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val isConnected: Boolean = false
)

class TrackDriverViewModel(application: Application) : AndroidViewModel(application) {
    private val rideRepository = RideRepository()

    private val _state = MutableStateFlow(TrackDriverState())
    val state: StateFlow<TrackDriverState> = _state.asStateFlow()

    fun loadRide(rideId: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            val result = rideRepository.getRideRequest(rideId)
            result.fold(
                onSuccess = { ride ->
                    _state.value = _state.value.copy(
                        rideRequest = ride,
                        isLoading = false
                    )
                    // Start tracking the assigned driver
                    ride.assignedDriver?.let { driver ->
                        SocketManager.trackDriver(driver.id)
                    }
                },
                onFailure = {
                    _state.value = _state.value.copy(isLoading = false, error = it.message)
                }
            )
        }
    }

    fun observeDriverLocation() {
        viewModelScope.launch {
            SocketManager.driverLocationUpdates.collect { location ->
                val ride = _state.value.rideRequest
                if (ride?.assignedDriver != null && location.driverId == ride.assignedDriver.id) {
                    _state.value = _state.value.copy(driverLocation = location)
                }
            }
        }
        viewModelScope.launch {
            SocketManager.connectionState.collect { connected ->
                _state.value = _state.value.copy(isConnected = connected)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TrackDriverScreen(
    rideId: String,
    onBack: () -> Unit,
    viewModel: TrackDriverViewModel = viewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(rideId) {
        viewModel.loadRide(rideId)
        viewModel.observeDriverLocation()
    }

    // Pulse animation
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.4f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.6f,
        targetValue = 0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseAlpha"
    )

    val defaultPosition = LatLng(37.7749, -122.4194)
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(defaultPosition, 14f)
    }

    // Follow driver location
    LaunchedEffect(state.driverLocation) {
        state.driverLocation?.let { loc ->
            cameraPositionState.animate(
                CameraUpdateFactory.newLatLngZoom(LatLng(loc.lat, loc.lng), 15f),
                1000
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Track Driver", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Indigo600,
                    titleContentColor = White,
                    navigationIconContentColor = White
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (state.isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Indigo600)
                }
            } else {
                // Map
                GoogleMap(
                    modifier = Modifier.fillMaxSize(),
                    cameraPositionState = cameraPositionState,
                    properties = MapProperties(mapType = MapType.NORMAL),
                    uiSettings = MapUiSettings(
                        zoomControlsEnabled = true,
                        compassEnabled = true,
                        mapToolbarEnabled = false
                    )
                ) {
                    // Driver marker
                    state.driverLocation?.let { loc ->
                        Marker(
                            state = MarkerState(position = LatLng(loc.lat, loc.lng)),
                            title = state.rideRequest?.assignedDriver?.name ?: "Driver",
                            snippet = "Speed: ${String.format("%.1f", loc.speed)} km/h",
                            icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_BLUE),
                            rotation = loc.heading.toFloat()
                        )
                    }

                    // Pickup marker
                    state.rideRequest?.pickupLocation?.coordinates?.let { coords ->
                        Marker(
                            state = MarkerState(position = LatLng(coords.lat, coords.lng)),
                            title = "Pickup",
                            snippet = state.rideRequest?.pickupLocation?.address,
                            icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN)
                        )
                    }

                    // Dropoff marker
                    state.rideRequest?.dropoffLocation?.coordinates?.let { coords ->
                        Marker(
                            state = MarkerState(position = LatLng(coords.lat, coords.lng)),
                            title = "Dropoff",
                            snippet = state.rideRequest?.dropoffLocation?.address,
                            icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED)
                        )
                    }
                }

                // Live tracking indicator
                Row(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(12.dp)
                        .background(White.copy(alpha = 0.95f), RoundedCornerShape(20.dp))
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        // Pulse ring
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .scale(pulseScale)
                                .clip(CircleShape)
                                .background(
                                    if (state.isConnected) Green500.copy(alpha = pulseAlpha)
                                    else Red500.copy(alpha = pulseAlpha)
                                )
                        )
                        // Center dot
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(if (state.isConnected) Green500 else Red500)
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (state.isConnected) "Live Tracking" else "Connecting...",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (state.isConnected) Green700 else Red500
                    )
                }

                // Driver info panel
                state.rideRequest?.let { ride ->
                    Card(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .fillMaxWidth()
                            .padding(12.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
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
                                            .size(44.dp)
                                            .background(Indigo50, CircleShape),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            Icons.Default.Person,
                                            contentDescription = null,
                                            tint = Indigo600,
                                            modifier = Modifier.size(24.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text(
                                            text = ride.assignedDriver?.name ?: "Driver",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 16.sp,
                                            color = Gray900
                                        )
                                        Text(
                                            text = ride.assignedDriver?.phone ?: "",
                                            fontSize = 13.sp,
                                            color = Gray500
                                        )
                                    }
                                }
                                StatusBadge(status = ride.status)
                            }

                            Spacer(modifier = Modifier.height(12.dp))
                            HorizontalDivider(color = Gray200)
                            Spacer(modifier = Modifier.height(12.dp))

                            // Speed info
                            state.driverLocation?.let { loc ->
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceEvenly
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text(
                                            text = "${String.format("%.1f", loc.speed)}",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 20.sp,
                                            color = Indigo600
                                        )
                                        Text("km/h", fontSize = 11.sp, color = Gray500)
                                    }
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text(
                                            text = "${String.format("%.0f", loc.heading)}",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 20.sp,
                                            color = Indigo600
                                        )
                                        Text("heading", fontSize = 11.sp, color = Gray500)
                                    }
                                    if (ride.eta != null) {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text(
                                                text = ride.eta,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 20.sp,
                                                color = Green600
                                            )
                                            Text("ETA", fontSize = 11.sp, color = Gray500)
                                        }
                                    }
                                }
                            }

                            if (state.driverLocation == null) {
                                Text(
                                    text = "Waiting for driver location updates...",
                                    fontSize = 13.sp,
                                    color = Gray400,
                                    modifier = Modifier.padding(vertical = 8.dp)
                                )
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.TripOrigin, contentDescription = null, tint = Green600, modifier = Modifier.size(12.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = ride.pickupLocation?.address ?: "N/A",
                                    fontSize = 12.sp,
                                    color = Gray600,
                                    maxLines = 1
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.LocationOn, contentDescription = null, tint = Red500, modifier = Modifier.size(12.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = ride.dropoffLocation?.address ?: "N/A",
                                    fontSize = 12.sp,
                                    color = Gray600,
                                    maxLines = 1
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

package com.transporthq.app.ui.screens.coordinator

import android.app.Application
import android.os.Handler
import android.os.Looper
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import com.transporthq.app.data.models.Driver
import com.transporthq.app.data.models.DriverLocation
import com.transporthq.app.data.repository.RideRepository
import com.transporthq.app.ui.components.StatusBadge
import com.transporthq.app.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class LiveMapState(
    val drivers: List<Driver> = emptyList(),
    val driverLocations: Map<String, DriverLocation> = emptyMap(),
    val isLoading: Boolean = false,
    val showDriverList: Boolean = false,
    val isSocketConnected: Boolean = false
)

class LiveMapViewModel(application: Application) : AndroidViewModel(application) {
    private val rideRepository = RideRepository()

    private val _state = MutableStateFlow(LiveMapState())
    val state: StateFlow<LiveMapState> = _state.asStateFlow()

    init {
        loadDrivers()
        observeSocketUpdates()
    }

    private fun loadDrivers() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            val result = rideRepository.getDrivers()
            result.fold(
                onSuccess = { drivers ->
                    val locations = mutableMapOf<String, DriverLocation>()
                    drivers.forEach { driver ->
                        driver.currentLocation?.let { coords ->
                            locations[driver.id] = DriverLocation(
                                driverId = driver.id,
                                lat = coords.lat,
                                lng = coords.lng,
                                speed = driver.speed,
                                heading = driver.heading
                            )
                        }
                    }
                    _state.value = _state.value.copy(
                        drivers = drivers,
                        driverLocations = locations,
                        isLoading = false
                    )
                },
                onFailure = {
                    _state.value = _state.value.copy(isLoading = false)
                }
            )
        }
    }

    private fun observeSocketUpdates() {
        viewModelScope.launch {
            SocketManager.driverLocationUpdates.collect { location ->
                val updatedLocations = _state.value.driverLocations.toMutableMap()
                updatedLocations[location.driverId] = location
                _state.value = _state.value.copy(driverLocations = updatedLocations)
            }
        }
        viewModelScope.launch {
            SocketManager.connectionState.collect { connected ->
                _state.value = _state.value.copy(isSocketConnected = connected)
            }
        }
    }

    fun toggleDriverList() {
        _state.value = _state.value.copy(showDriverList = !_state.value.showDriverList)
    }

    fun refresh() {
        loadDrivers()
    }
}

@Composable
fun LiveMapScreen(
    viewModel: LiveMapViewModel = viewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    // Default center (can be adjusted)
    val defaultPosition = LatLng(37.7749, -122.4194) // San Francisco
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(defaultPosition, 12f)
    }

    // Animate to first driver location when loaded
    LaunchedEffect(state.driverLocations) {
        state.driverLocations.values.firstOrNull()?.let { loc ->
            cameraPositionState.animate(
                CameraUpdateFactory.newLatLngZoom(LatLng(loc.lat, loc.lng), 13f)
            )
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // Map
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            properties = MapProperties(
                isMyLocationEnabled = false,
                mapType = MapType.NORMAL
            ),
            uiSettings = MapUiSettings(
                zoomControlsEnabled = true,
                compassEnabled = true,
                mapToolbarEnabled = false
            )
        ) {
            // Driver markers
            state.driverLocations.forEach { (driverId, location) ->
                val driver = state.drivers.find { it.id == driverId }
                val position = LatLng(location.lat, location.lng)

                Marker(
                    state = MarkerState(position = position),
                    title = driver?.name ?: "Driver",
                    snippet = "Speed: ${String.format("%.1f", location.speed)} km/h",
                    icon = BitmapDescriptorFactory.defaultMarker(
                        when (driver?.status) {
                            "on-trip" -> BitmapDescriptorFactory.HUE_BLUE
                            "available", "on-duty" -> BitmapDescriptorFactory.HUE_GREEN
                            else -> BitmapDescriptorFactory.HUE_RED
                        }
                    ),
                    rotation = location.heading.toFloat()
                )
            }
        }

        // Stats overlay
        Card(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(12.dp),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = White.copy(alpha = 0.95f)),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(if (state.isSocketConnected) Green500 else Red500)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (state.isSocketConnected) "Live" else "Offline",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (state.isSocketConnected) Green600 else Red500
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "${state.driverLocations.size} drivers on map",
                    fontSize = 13.sp,
                    color = Gray700
                )
                Text(
                    text = "${state.drivers.count { it.status == "on-trip" }} on trip",
                    fontSize = 12.sp,
                    color = Gray500
                )
            }
        }

        // FAB to toggle driver list
        Column(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FloatingActionButton(
                onClick = { viewModel.refresh() },
                containerColor = White,
                contentColor = Indigo600,
                modifier = Modifier.size(48.dp)
            ) {
                Icon(Icons.Default.Refresh, contentDescription = "Refresh")
            }
            FloatingActionButton(
                onClick = { viewModel.toggleDriverList() },
                containerColor = Indigo600,
                contentColor = White
            ) {
                Icon(Icons.Default.People, contentDescription = "Driver List")
            }
        }

        // Driver list panel
        AnimatedVisibility(
            visible = state.showDriverList,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 300.dp)
                    .padding(horizontal = 12.dp, vertical = 72.dp),
                shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
                colors = CardDefaults.cardColors(containerColor = White),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "Drivers",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                        IconButton(
                            onClick = { viewModel.toggleDriverList() },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Default.Close, contentDescription = "Close", modifier = Modifier.size(20.dp))
                        }
                    }
                    HorizontalDivider(color = Gray200)
                    LazyColumn {
                        items(state.drivers) { driver ->
                            DriverListItem(
                                driver = driver,
                                location = state.driverLocations[driver.id],
                                onClick = {
                                    state.driverLocations[driver.id]?.let { loc ->
                                        viewModel.toggleDriverList()
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DriverListItem(
    driver: Driver,
    location: DriverLocation?,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
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
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = driver.name,
                fontWeight = FontWeight.Medium,
                fontSize = 14.sp,
                color = Gray900
            )
            Text(
                text = if (location != null) "Speed: ${String.format("%.1f", location.speed)} km/h" else "No location",
                fontSize = 12.sp,
                color = Gray500
            )
        }
        StatusBadge(status = driver.status)
    }
}

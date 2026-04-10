package com.transporthq.app.ui.screens.driver

import android.Manifest
import android.app.Application
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*
import com.transporthq.app.data.models.Trip
import com.transporthq.app.data.repository.TripRepository
import com.transporthq.app.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DriverMapState(
    val currentLocation: LatLng? = null,
    val speed: Float = 0f,
    val heading: Float = 0f,
    val assignedTrips: List<Trip> = emptyList(),
    val isLoading: Boolean = false,
    val hasPermission: Boolean = false
)

class DriverMapViewModel(application: Application) : AndroidViewModel(application) {
    private val tripRepository = TripRepository()
    private val _state = MutableStateFlow(DriverMapState())
    val state: StateFlow<DriverMapState> = _state.asStateFlow()

    private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(application)
    private var locationCallback: LocationCallback? = null

    init { loadTrips() }

    fun loadTrips() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            val result = tripRepository.getTrips()
            result.fold(
                onSuccess = { trips ->
                    val active = trips.filter { it.status in listOf("assigned", "driver-departed", "arrived-pickup", "in-progress") }
                    _state.value = _state.value.copy(assignedTrips = active, isLoading = false)
                },
                onFailure = { _state.value = _state.value.copy(isLoading = false) }
            )
        }
    }

    @Suppress("MissingPermission")
    fun startLocationUpdates() {
        _state.value = _state.value.copy(hasPermission = true)
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 3000).build()
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { loc ->
                    _state.value = _state.value.copy(
                        currentLocation = LatLng(loc.latitude, loc.longitude),
                        speed = loc.speed * 3.6f,
                        heading = loc.bearing
                    )
                }
            }
        }
        fusedLocationClient.requestLocationUpdates(request, locationCallback!!, null)
    }

    override fun onCleared() {
        super.onCleared()
        locationCallback?.let { fusedLocationClient.removeLocationUpdates(it) }
    }
}

@Composable
fun DriverMapScreen(viewModel: DriverMapViewModel = viewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true) {
            viewModel.startLocationUpdates()
        }
    }

    LaunchedEffect(Unit) {
        permissionLauncher.launch(arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ))
    }

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(
            state.currentLocation ?: LatLng(34.0522, -118.2437), 14f
        )
    }

    LaunchedEffect(state.currentLocation) {
        state.currentLocation?.let {
            cameraPositionState.position = CameraPosition.fromLatLngZoom(it, 15f)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            properties = MapProperties(isMyLocationEnabled = state.hasPermission),
            uiSettings = MapUiSettings(zoomControlsEnabled = false)
        ) {
            // Trip pickup/dropoff locations are address strings without coordinates.
            // Map markers for these locations will appear when the server provides coordinate data.
            // The driver's own live position is shown via the blue dot (isMyLocationEnabled).
        }

        // HUD overlay - top left
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
                        modifier = Modifier.size(8.dp).background(
                            if (state.hasPermission) Green600 else Red500, CircleShape
                        )
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        if (state.hasPermission) "Live" else "Off",
                        fontSize = 11.sp, color = if (state.hasPermission) Green600 else Red500,
                        fontWeight = FontWeight.Medium
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text("${state.speed.toInt()} km/h", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Gray900)
                Text("Speed", fontSize = 11.sp, color = Gray500)
                Spacer(modifier = Modifier.height(4.dp))
                val dirs = arrayOf("N", "NE", "E", "SE", "S", "SW", "W", "NW")
                val dir = dirs[((state.heading + 22.5f) / 45f).toInt() % 8]
                Text(dir, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = Indigo600)
                Text("Heading", fontSize = 11.sp, color = Gray500)
            }
        }

        // Assigned trips card - bottom
        if (state.assignedTrips.isNotEmpty()) {
            Card(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(12.dp),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = White.copy(alpha = 0.95f)),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        "${state.assignedTrips.size} Active Trip${if (state.assignedTrips.size > 1) "s" else ""}",
                        fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Gray900
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    state.assignedTrips.take(3).forEach { trip ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    (trip.rideRequest?.passenger ?: trip.rideRequest?.requester)?.name ?: trip.driver?.name ?: "Trip",
                                    fontSize = 13.sp, fontWeight = FontWeight.Medium, color = Gray800
                                )
                                Text(
                                    trip.displayPickup,
                                    fontSize = 11.sp, color = Gray500, maxLines = 1
                                )
                            }
                            IconButton(
                                onClick = {
                                    val addr = trip.displayPickup.takeIf { it != "N/A" } ?: return@IconButton
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=${Uri.encode(addr)}"))
                                    intent.setPackage("com.google.android.apps.maps")
                                    context.startActivity(intent)
                                },
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(Icons.Default.Navigation, contentDescription = "Navigate", tint = Indigo600, modifier = Modifier.size(18.dp))
                            }
                        }
                        if (trip != state.assignedTrips.take(3).last()) {
                            Divider(color = Gray200, modifier = Modifier.padding(vertical = 2.dp))
                        }
                    }
                }
            }
        }
    }
}

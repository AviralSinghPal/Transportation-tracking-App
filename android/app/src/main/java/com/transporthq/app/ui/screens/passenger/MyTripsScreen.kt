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
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.transporthq.app.data.api.RetrofitClient
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
    val error: String? = null,
    val ratedTrips: Set<String> = emptySet(),
    val showRatingDialog: String? = null,
    val ratingSubmitting: Boolean = false
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
                    checkRatings()
                },
                onFailure = { error ->
                    _state.value = _state.value.copy(isLoading = false, error = error.message)
                }
            )
        }
    }

    fun checkRatings() {
        viewModelScope.launch {
            val completedTrips = _state.value.trips.filter { it.status == "completed" }
            val rated = mutableSetOf<String>()
            for (trip in completedTrips) {
                try {
                    val response = RetrofitClient.apiService.checkTripRating(trip.id)
                    if (response.isSuccessful) {
                        val body = response.body()
                        if (body != null && body.hasRated) {
                            rated.add(trip.id)
                        }
                    }
                } catch (_: Exception) {}
            }
            _state.value = _state.value.copy(ratedTrips = rated)
        }
    }

    fun showRatingDialog(tripId: String) {
        _state.value = _state.value.copy(showRatingDialog = tripId)
    }

    fun dismissRatingDialog() {
        _state.value = _state.value.copy(showRatingDialog = null)
    }

    fun submitRating(tripId: String, rating: Int, comment: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(ratingSubmitting = true)
            try {
                val body = mapOf("tripId" to tripId, "rating" to rating, "comment" to comment, "type" to "trip")
                RetrofitClient.apiService.submitRating(body)
                _state.value = _state.value.copy(
                    ratedTrips = _state.value.ratedTrips + tripId,
                    showRatingDialog = null,
                    ratingSubmitting = false
                )
            } catch (_: Exception) {
                _state.value = _state.value.copy(ratingSubmitting = false)
            }
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
                    PassengerTripCard(
                        trip = trip,
                        hasRated = trip.id in state.ratedTrips,
                        onRate = { viewModel.showRatingDialog(trip.id) }
                    )
                }
            }
        }
    }

    // Rating dialog
    state.showRatingDialog?.let { tripId ->
        RatingDialog(
            onSubmit = { rating, comment -> viewModel.submitRating(tripId, rating, comment) },
            onDismiss = { viewModel.dismissRatingDialog() },
            isSubmitting = state.ratingSubmitting
        )
    }
}

@Composable
private fun PassengerTripCard(trip: Trip, hasRated: Boolean = false, onRate: () -> Unit = {}) {
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
                    text = trip.displayPickup,
                    fontSize = 13.sp,
                    color = Gray700
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.LocationOn, contentDescription = null, tint = Red500, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = trip.displayDropoff,
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

            if (trip.status == "completed") {
                Spacer(modifier = Modifier.height(8.dp))
                Divider(color = Gray200)
                Spacer(modifier = Modifier.height(8.dp))
                if (hasRated) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Green600, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Rated", fontSize = 13.sp, color = Green600, fontWeight = FontWeight.Medium)
                    }
                } else {
                    OutlinedButton(
                        onClick = onRate,
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Indigo600)
                    ) {
                        Icon(Icons.Default.Star, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Rate Trip", fontSize = 13.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun RatingDialog(
    onSubmit: (Int, String) -> Unit,
    onDismiss: () -> Unit,
    isSubmitting: Boolean = false
) {
    var rating by remember { mutableIntStateOf(0) }
    var comment by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Rate Your Trip", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("How was your ride?", fontSize = 14.sp, color = Gray600)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    (1..5).forEach { star ->
                        IconButton(onClick = { rating = star }) {
                            Icon(
                                if (star <= rating) Icons.Default.Star else Icons.Default.StarBorder,
                                contentDescription = "Star $star",
                                tint = if (star <= rating) Amber500 else Gray400,
                                modifier = Modifier.size(36.dp)
                            )
                        }
                    }
                }
                OutlinedTextField(
                    value = comment,
                    onValueChange = { comment = it },
                    label = { Text("Comment (optional)") },
                    placeholder = { Text("Share your experience...") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    minLines = 2,
                    maxLines = 4
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onSubmit(rating, comment) },
                enabled = rating > 0 && !isSubmitting,
                colors = ButtonDefaults.buttonColors(containerColor = Indigo600),
                shape = RoundedCornerShape(8.dp)
            ) {
                if (isSubmitting) CircularProgressIndicator(modifier = Modifier.size(16.dp), color = White)
                else Text("Submit")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel", color = Gray500) }
        },
        shape = RoundedCornerShape(16.dp)
    )
}

package com.transporthq.app.data.models

import com.google.gson.annotations.SerializedName

data class PermanentTrip(
    @SerializedName("_id") val id: String = "",
    val title: String = "",
    val pickupLocation: String = "",
    val pickupCoordinates: Coordinates? = null,
    val dropoffLocation: String = "",
    val dropoffCoordinates: Coordinates? = null,
    val scheduledTime: String = "",
    val driver: DriverRef? = null,
    val vehicle: VehicleRef? = null,
    val passengers: List<PermanentTripPassenger> = emptyList(),
    val startDate: String? = null,
    val endDate: String? = null,
    val activeDays: List<String> = emptyList(),
    val status: String = "draft",
    val isFullDayTrip: Boolean = false,
    val notes: String? = null,
    val swapHistory: List<SwapHistoryEntry> = emptyList(),
    val createdAt: String? = null,
    val updatedAt: String? = null
)

data class PermanentTripPassenger(
    @SerializedName("_id") val id: String = "",
    val userId: String? = null,
    val name: String = "",
    val phone: String? = null
)

data class SwapHistoryEntry(
    val type: String = "",
    val previousId: String? = null,
    val newId: String? = null,
    val reason: String? = null,
    val swappedAt: String? = null,
    val swappedBy: String? = null
)

data class PermanentTripsResponse(
    val permanentTrips: List<PermanentTrip> = emptyList()
)

data class PermanentTripResponse(
    val permanentTrip: PermanentTrip
)

data class CreatePermanentTripRequest(
    val title: String,
    val pickupLocation: String,
    val dropoffLocation: String,
    val scheduledTime: String,
    val startDate: String,
    val endDate: String,
    val activeDays: List<String> = listOf("Mon", "Tue", "Wed", "Thu", "Fri"),
    val notes: String = ""
)

data class SwapDriverRequest(
    val newDriverId: String?,
    val reason: String = ""
)

data class SwapVehicleRequest(
    val newVehicleId: String?,
    val reason: String = ""
)

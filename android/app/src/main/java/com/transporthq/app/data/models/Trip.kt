package com.transporthq.app.data.models

import com.google.gson.annotations.SerializedName

data class Trip(
    @SerializedName("_id") val id: String = "",
    val rideRequest: RideRequestRef? = null,
    val driver: DriverRef? = null,
    val vehicle: VehicleRef? = null,
    val status: String = "assigned",
    val pickupLocation: String? = null,
    val dropoffLocation: String? = null,
    val passengers: List<TripPassengerStop>? = null,
    val scheduledTime: String? = null,
    val startTime: String? = null,
    val endTime: String? = null,
    val passengerCount: Int = 1,
    val notes: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
) {
    val displayPickup: String
        get() = pickupLocation
            ?: rideRequest?.pickupLocation
            ?: passengers?.firstOrNull()?.pickupAddress
            ?: "N/A"

    val displayDropoff: String
        get() = dropoffLocation
            ?: rideRequest?.dropoffLocation
            ?: passengers?.firstOrNull()?.dropoffAddress
            ?: "N/A"
}

data class TripPassengerStop(
    @SerializedName("_id") val id: String = "",
    val name: String = "",
    val phone: String = "",
    val pickupAddress: String = "",
    val dropoffAddress: String = "",
    val pickupTime: String? = null,
    val dropoffTime: String? = null,
    val status: String = "waiting",
    val user: PassengerRef? = null
)

data class RideRequestRef(
    @SerializedName("_id") val id: String = "",
    val pickupLocation: String? = null,
    val dropoffLocation: String? = null,
    val passenger: PassengerRef? = null,
    val requester: PassengerRef? = null,
    val passengerCount: Int = 1,
    val priority: String = "normal",
    val notes: String? = null
)

data class DriverRef(
    @SerializedName("_id") val id: String = "",
    val name: String = "",
    val phone: String = "",
    val email: String = "",
    val status: String = "available"
)

data class VehicleRef(
    @SerializedName("_id") val id: String = "",
    val name: String = "",
    @SerializedName("licensePlate") val plateNumber: String = "",
    val type: String = "",
    val capacity: Int = 4
)

data class PassengerRef(
    @SerializedName("_id") val id: String = "",
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val department: String = ""
)

data class LocationInfo(
    val address: String = "",
    val coordinates: Coordinates? = null
)

data class Coordinates(
    val lat: Double = 0.0,
    val lng: Double = 0.0
)

data class TripStatusUpdate(
    val status: String,
    val location: Coordinates? = null
)

data class TripsResponse(
    val trips: List<Trip> = emptyList()
)

data class TripDetailResponse(
    val trip: Trip,
    val events: List<TripEvent> = emptyList()
)

data class TripResponse(
    val trip: Trip
)

data class TripEvent(
    @SerializedName("_id") val id: String = "",
    val trip: String = "",
    val type: String = "",
    val actor: TripEventActor? = null,
    val details: String? = null,
    val location: Coordinates? = null,
    val timestamp: String? = null,
    val createdAt: String? = null
)

data class TripEventActor(
    @SerializedName("_id") val id: String = "",
    val name: String = "",
    val role: String = ""
)

data class CreateTripRequest(
    val title: String,
    val date: String,
    val driverId: String? = null,
    val vehicleId: String? = null,
    val passengers: List<TripPassengerInput> = emptyList(),
    val pickupLocation: String = "",
    val dropoffLocation: String = "",
    val scheduledTime: String? = null,
    val notes: String = ""
)

data class TripPassengerInput(
    val userId: String,
    val name: String = ""
)

data class AssignTripRequest(
    val driverId: String,
    val vehicleId: String
)

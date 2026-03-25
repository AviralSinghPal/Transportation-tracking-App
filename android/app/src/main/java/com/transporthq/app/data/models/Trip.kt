package com.transporthq.app.data.models

import com.google.gson.annotations.SerializedName

data class Trip(
    @SerializedName("_id") val id: String = "",
    val rideRequest: RideRequestRef? = null,
    val driver: DriverRef? = null,
    val vehicle: VehicleRef? = null,
    val status: String = "assigned",
    val pickupLocation: LocationInfo? = null,
    val dropoffLocation: LocationInfo? = null,
    val scheduledTime: String? = null,
    val startTime: String? = null,
    val endTime: String? = null,
    val passengerCount: Int = 1,
    val notes: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

data class RideRequestRef(
    @SerializedName("_id") val id: String = "",
    val pickupLocation: LocationInfo? = null,
    val dropoffLocation: LocationInfo? = null,
    val passenger: PassengerRef? = null,
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
    val plateNumber: String = "",
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

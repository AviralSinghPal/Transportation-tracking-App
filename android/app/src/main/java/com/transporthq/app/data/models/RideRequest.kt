package com.transporthq.app.data.models

import com.google.gson.annotations.SerializedName

data class RideRequest(
    @SerializedName("_id") val id: String = "",
    val passenger: PassengerRef? = null,
    val pickupLocation: LocationInfo? = null,
    val dropoffLocation: LocationInfo? = null,
    val pickupTime: String? = null,
    val passengerCount: Int = 1,
    val priority: String = "normal",
    val status: String = "pending",
    val department: String = "",
    val notes: String? = null,
    val assignedDriver: DriverRef? = null,
    val assignedVehicle: VehicleRef? = null,
    val eta: String? = null,
    val trip: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

data class CreateRideRequest(
    val pickupLocation: LocationInfo,
    val dropoffLocation: LocationInfo,
    val pickupTime: String,
    val passengerCount: Int,
    val priority: String = "normal",
    val department: String = "",
    val notes: String = ""
)

data class RideStatusUpdate(
    val status: String
)

data class AssignRideRequest(
    val driverId: String,
    val vehicleId: String,
    val eta: String
)

data class RideRequestsResponse(
    val rideRequests: List<RideRequest> = emptyList()
)

data class RideRequestResponse(
    val rideRequest: RideRequest
)

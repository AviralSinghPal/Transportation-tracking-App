package com.transporthq.app.data.models

import com.google.gson.annotations.SerializedName

data class RideRequest(
    @SerializedName("_id") val id: String = "",
    val passenger: PassengerRef? = null,
    val requester: PassengerRef? = null,
    val pickupLocation: String? = null,
    val dropoffLocation: String? = null,
    val pickupTime: String? = null,
    val passengerCount: Int = 1,
    val priority: String = "normal",
    val status: String = "pending",
    val department: String = "",
    val notes: String? = null,
    val driver: DriverRef? = null,
    val vehicle: VehicleRef? = null,
    val assignedDriver: DriverRef? = null,
    val assignedVehicle: VehicleRef? = null,
    val isPACall: Boolean = false,
    val callType: String? = null,
    val isSharedRide: Boolean = false,
    val eta: String? = null,
    val trip: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
) {
    val displayDriver: DriverRef? get() = driver ?: assignedDriver
    val displayVehicle: VehicleRef? get() = vehicle ?: assignedVehicle
    val displayPassenger: PassengerRef? get() = passenger ?: requester
}

data class CreateRideRequest(
    val pickupLocation: String,
    val dropoffLocation: String,
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
    val eta: Int = 15
)

data class RideRequestsResponse(
    val rideRequests: List<RideRequest> = emptyList()
)

data class RideRequestResponse(
    val rideRequest: RideRequest
)

data class RejectRideRequest(
    val reason: String
)

package com.transporthq.app.data.models

import com.google.gson.annotations.SerializedName

data class Driver(
    @SerializedName("_id") val id: String = "",
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val status: String = "available",
    val isAvailable: Boolean = true,
    val isTemporary: Boolean = false,
    val licenseNumber: String? = null,
    val licenseExpiry: String? = null,
    val isPermanentlyAllocated: Boolean = false,
    val allocatedTo: String? = null,
    val currentLocation: Coordinates? = null,
    val speed: Double = 0.0,
    val heading: Double = 0.0,
    val lastLocationUpdate: String? = null
)

data class DriversResponse(
    val drivers: List<Driver> = emptyList()
)

data class DriverResponse(
    val driver: Driver
)

data class CreateTempDriverRequest(
    val name: String,
    val phone: String,
    val licenseNumber: String? = null
)

data class AvailabilityUpdate(
    val isAvailable: Boolean
)

data class DriverLocation(
    val driverId: String = "",
    val lat: Double = 0.0,
    val lng: Double = 0.0,
    val speed: Double = 0.0,
    val heading: Double = 0.0
)

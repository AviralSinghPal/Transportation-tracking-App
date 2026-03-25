package com.transporthq.app.data.models

import com.google.gson.annotations.SerializedName

data class Driver(
    @SerializedName("_id") val id: String = "",
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val status: String = "available",
    val currentLocation: Coordinates? = null,
    val speed: Double = 0.0,
    val heading: Double = 0.0,
    val lastLocationUpdate: String? = null
)

data class DriversResponse(
    val drivers: List<Driver> = emptyList()
)

data class DriverLocation(
    val driverId: String = "",
    val lat: Double = 0.0,
    val lng: Double = 0.0,
    val speed: Double = 0.0,
    val heading: Double = 0.0
)

package com.transporthq.app.data.models

import com.google.gson.annotations.SerializedName

data class Vehicle(
    @SerializedName("_id") val id: String = "",
    val name: String = "",
    val plateNumber: String = "",
    val type: String = "sedan",
    val capacity: Int = 4,
    val status: String = "available",
    val make: String = "",
    val model: String = "",
    val year: Int = 0,
    val color: String = "",
    val fuelType: String = "",
    val mileage: Int = 0
)

data class VehiclesResponse(
    val vehicles: List<Vehicle> = emptyList()
)

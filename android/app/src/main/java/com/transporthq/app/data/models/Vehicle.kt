package com.transporthq.app.data.models

import com.google.gson.annotations.SerializedName

data class Vehicle(
    @SerializedName("_id") val id: String = "",
    val name: String = "",
    @SerializedName("licensePlate") val plateNumber: String = "",
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

data class VehicleResponse(
    val vehicle: Vehicle
)

data class CreateVehicleRequest(
    val name: String,
    @SerializedName("licensePlate") val plateNumber: String,
    val type: String = "sedan",
    val capacity: Int = 4,
    val make: String = "",
    val model: String = "",
    val year: Int = 0,
    val color: String = "",
    val fuelType: String = ""
)

data class UpdateVehicleRequest(
    val name: String? = null,
    @SerializedName("licensePlate") val plateNumber: String? = null,
    val type: String? = null,
    val capacity: Int? = null,
    val status: String? = null,
    val make: String? = null,
    val model: String? = null,
    val color: String? = null,
    val fuelType: String? = null
)

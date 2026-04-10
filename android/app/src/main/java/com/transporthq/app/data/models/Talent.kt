package com.transporthq.app.data.models

import com.google.gson.annotations.SerializedName

data class TalentProfile(
    @SerializedName("_id") val id: String = "",
    val name: String = "",
    val phone: String = "",
    val email: String = "",
    val status: String = "at-hotel",
    val isConfidential: Boolean = false,
    val vehiclePreference: String = "",
    val musicPreference: String = "",
    val waterPreference: String = "",
    val snackPreference: String = "",
    val drinkPreference: String = "",
    val hotelName: String = "",
    val hotelAddress: String = "",
    val agentName: String = "",
    val agentPhone: String = "",
    val preferredDriver: DriverRef? = null,
    val totalTrips: Int = 0,
    val totalCost: Double = 0.0,
    val totalMiles: Double = 0.0,
    val notes: String = "",
    val createdAt: String? = null
)

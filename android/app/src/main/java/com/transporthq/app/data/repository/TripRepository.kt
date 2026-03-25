package com.transporthq.app.data.repository

import com.transporthq.app.data.api.RetrofitClient
import com.transporthq.app.data.models.Coordinates
import com.transporthq.app.data.models.Trip
import com.transporthq.app.data.models.TripStatusUpdate

class TripRepository {

    private val api = RetrofitClient.apiService

    suspend fun getTrips(date: String? = null): Result<List<Trip>> {
        return try {
            val response = api.getTrips(date)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.trips)
            } else {
                Result.failure(Exception("Failed to fetch trips: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateTripStatus(tripId: String, status: String, location: Coordinates? = null): Result<Trip> {
        return try {
            val response = api.updateTripStatus(tripId, TripStatusUpdate(status, location))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to update trip status: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

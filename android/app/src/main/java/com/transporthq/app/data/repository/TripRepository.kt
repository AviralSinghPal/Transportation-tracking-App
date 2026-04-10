package com.transporthq.app.data.repository

import com.transporthq.app.data.api.RetrofitClient
import com.transporthq.app.data.models.*

class TripRepository {

    private val api = RetrofitClient.apiService

    suspend fun getTrips(date: String? = null): Result<List<Trip>> {
        return try {
            val response = api.getTrips(date)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to fetch trips: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTripDetail(id: String): Result<TripDetailResponse> {
        return try {
            val response = api.getTripDetail(id)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to fetch trip detail: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createTrip(request: CreateTripRequest): Result<Trip> {
        return try {
            val response = api.createTrip(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to create trip: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun assignTrip(id: String, driverId: String, vehicleId: String): Result<Trip> {
        return try {
            val response = api.assignTrip(id, AssignTripRequest(driverId, vehicleId))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to assign trip: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun cancelTrip(id: String): Result<Unit> {
        return try {
            val response = api.cancelTrip(id)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to cancel trip: ${response.code()}"))
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

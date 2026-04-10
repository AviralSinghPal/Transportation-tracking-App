package com.transporthq.app.data.repository

import com.transporthq.app.data.api.RetrofitClient
import com.transporthq.app.data.models.*

class RideRepository {

    private val api = RetrofitClient.apiService

    suspend fun getRideRequests(): Result<List<RideRequest>> {
        return try {
            val response = api.getRideRequests()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to fetch ride requests: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createRideRequest(request: CreateRideRequest): Result<RideRequest> {
        return try {
            val response = api.createRideRequest(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to create ride request: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getRideRequest(id: String): Result<RideRequest> {
        return try {
            val response = api.getRideRequest(id)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to fetch ride request: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateRideRequestStatus(id: String, status: String): Result<RideRequest> {
        return try {
            val response = api.updateRideRequestStatus(id, RideStatusUpdate(status))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to update ride request: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun approveRideRequest(id: String): Result<RideRequest> {
        return try {
            val response = api.approveRideRequest(id)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to approve ride request: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun rejectRideRequest(id: String, reason: String): Result<RideRequest> {
        return try {
            val response = api.rejectRideRequest(id, RejectRideRequest(reason))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to reject ride request: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun assignRideRequest(id: String, driverId: String, vehicleId: String, eta: String): Result<RideRequest> {
        return try {
            val response = api.assignRideRequest(id, AssignRideRequest(driverId, vehicleId, eta.replace(Regex("[^0-9]"), "").toIntOrNull() ?: 15))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to assign ride request: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getVehicles(): Result<List<Vehicle>> {
        return try {
            val response = api.getVehicles()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to fetch vehicles: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun addStop(rideId: String, body: Map<String, Any>): Result<Any> {
        return try {
            val response = api.addRideStop(rideId, body)
            if (response.isSuccessful) Result.success(response.body()!!)
            else Result.failure(Exception("Failed"))
        } catch (e: Exception) { Result.failure(e) }
    }

    suspend fun addPassenger(rideId: String, body: Map<String, Any>): Result<Any> {
        return try {
            val response = api.addRidePassenger(rideId, body)
            if (response.isSuccessful) Result.success(response.body()!!)
            else Result.failure(Exception("Failed"))
        } catch (e: Exception) { Result.failure(e) }
    }

    suspend fun getDrivers(): Result<List<Driver>> {
        return try {
            val response = api.getDrivers()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to fetch drivers: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

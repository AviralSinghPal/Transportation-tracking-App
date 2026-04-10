package com.transporthq.app.data.repository

import com.transporthq.app.data.api.RetrofitClient
import com.transporthq.app.data.models.*

class PermanentTripRepository {

    private val api = RetrofitClient.apiService

    suspend fun getPermanentTrips(status: String? = null): Result<List<PermanentTrip>> {
        return try {
            val response = api.getPermanentTrips(status)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to fetch: ${response.code()}"))
            }
        } catch (e: Exception) { Result.failure(e) }
    }

    suspend fun createPermanentTrip(request: CreatePermanentTripRequest): Result<PermanentTrip> {
        return try {
            val response = api.createPermanentTrip(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to create: ${response.code()}"))
            }
        } catch (e: Exception) { Result.failure(e) }
    }

    suspend fun swapDriver(id: String, newDriverId: String?, reason: String): Result<PermanentTrip> {
        return try {
            val response = api.swapPermanentTripDriver(id, SwapDriverRequest(newDriverId, reason))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to swap driver: ${response.code()}"))
            }
        } catch (e: Exception) { Result.failure(e) }
    }

    suspend fun swapVehicle(id: String, newVehicleId: String?, reason: String): Result<PermanentTrip> {
        return try {
            val response = api.swapPermanentTripVehicle(id, SwapVehicleRequest(newVehicleId, reason))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to swap vehicle: ${response.code()}"))
            }
        } catch (e: Exception) { Result.failure(e) }
    }

    suspend fun activate(id: String): Result<PermanentTrip> {
        return try {
            val response = api.activatePermanentTrip(id)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to activate: ${response.code()}"))
            }
        } catch (e: Exception) { Result.failure(e) }
    }

    suspend fun pause(id: String): Result<PermanentTrip> {
        return try {
            val response = api.pausePermanentTrip(id)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to pause: ${response.code()}"))
            }
        } catch (e: Exception) { Result.failure(e) }
    }

    suspend fun delete(id: String): Result<Unit> {
        return try {
            val response = api.deletePermanentTrip(id)
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Failed to delete: ${response.code()}"))
        } catch (e: Exception) { Result.failure(e) }
    }
}

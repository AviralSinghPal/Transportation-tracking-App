package com.transporthq.app.data.repository

import com.transporthq.app.data.api.RetrofitClient
import com.transporthq.app.data.models.*

class DriverRepository {

    private val api = RetrofitClient.apiService

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

    suspend fun getAvailableDrivers(): Result<List<Driver>> {
        return try {
            val response = api.getAvailableDrivers()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to fetch available drivers: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun toggleAvailability(id: String, isAvailable: Boolean): Result<Driver> {
        return try {
            val response = api.toggleDriverAvailability(id, AvailabilityUpdate(isAvailable))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.driver)
            } else {
                Result.failure(Exception("Failed to update availability: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createTempDriver(name: String, phone: String, licenseNumber: String?): Result<Driver> {
        return try {
            val response = api.createTempDriver(CreateTempDriverRequest(name, phone, licenseNumber))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.driver)
            } else {
                Result.failure(Exception("Failed to create temp driver: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

package com.transporthq.app.data.repository

import com.transporthq.app.data.api.RetrofitClient
import com.transporthq.app.data.models.*

class VehicleRepository {

    private val api = RetrofitClient.apiService

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

    suspend fun createVehicle(request: CreateVehicleRequest): Result<Vehicle> {
        return try {
            val response = api.createVehicle(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.vehicle)
            } else {
                Result.failure(Exception("Failed to create vehicle: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateVehicle(id: String, request: UpdateVehicleRequest): Result<Vehicle> {
        return try {
            val response = api.updateVehicle(id, request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.vehicle)
            } else {
                Result.failure(Exception("Failed to update vehicle: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteVehicle(id: String): Result<Unit> {
        return try {
            val response = api.deleteVehicle(id)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to delete vehicle: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

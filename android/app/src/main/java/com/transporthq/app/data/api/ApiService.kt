package com.transporthq.app.data.api

import com.transporthq.app.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // Auth
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    // Trips
    @GET("trips")
    suspend fun getTrips(@Query("date") date: String? = null): Response<TripsResponse>

    @PUT("trips/{id}/status")
    suspend fun updateTripStatus(
        @Path("id") tripId: String,
        @Body statusUpdate: TripStatusUpdate
    ): Response<Trip>

    // Ride Requests
    @GET("ride-requests")
    suspend fun getRideRequests(): Response<RideRequestsResponse>

    @POST("ride-requests")
    suspend fun createRideRequest(@Body request: CreateRideRequest): Response<RideRequestResponse>

    @GET("ride-requests/{id}")
    suspend fun getRideRequest(@Path("id") id: String): Response<RideRequestResponse>

    @PUT("ride-requests/{id}/status")
    suspend fun updateRideRequestStatus(
        @Path("id") id: String,
        @Body statusUpdate: RideStatusUpdate
    ): Response<RideRequestResponse>

    @PUT("ride-requests/{id}/approve")
    suspend fun approveRideRequest(@Path("id") id: String): Response<RideRequestResponse>

    @PUT("ride-requests/{id}/assign")
    suspend fun assignRideRequest(
        @Path("id") id: String,
        @Body assignment: AssignRideRequest
    ): Response<RideRequestResponse>

    // Vehicles
    @GET("vehicles")
    suspend fun getVehicles(): Response<VehiclesResponse>

    // Drivers
    @GET("drivers")
    suspend fun getDrivers(): Response<DriversResponse>
}

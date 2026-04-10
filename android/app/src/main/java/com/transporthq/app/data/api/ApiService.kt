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
    suspend fun getTrips(@Query("date") date: String? = null): Response<List<Trip>>

    @GET("trips/{id}")
    suspend fun getTripDetail(@Path("id") id: String): Response<TripDetailResponse>

    @GET("trips/{id}/events")
    suspend fun getTripEvents(@Path("id") id: String): Response<List<TripEvent>>

    @POST("trips")
    suspend fun createTrip(@Body request: CreateTripRequest): Response<Trip>

    @PUT("trips/{id}/status")
    suspend fun updateTripStatus(
        @Path("id") tripId: String,
        @Body statusUpdate: TripStatusUpdate
    ): Response<Trip>

    @PUT("trips/{id}/assign")
    suspend fun assignTrip(
        @Path("id") id: String,
        @Body request: AssignTripRequest
    ): Response<Trip>

    @DELETE("trips/{id}")
    suspend fun cancelTrip(@Path("id") id: String): Response<Any>

    // Ride Requests
    @GET("ride-requests")
    suspend fun getRideRequests(): Response<List<RideRequest>>

    @POST("ride-requests")
    suspend fun createRideRequest(@Body request: CreateRideRequest): Response<RideRequest>

    @GET("ride-requests/{id}")
    suspend fun getRideRequest(@Path("id") id: String): Response<RideRequest>

    @PUT("ride-requests/{id}/status")
    suspend fun updateRideRequestStatus(
        @Path("id") id: String,
        @Body statusUpdate: RideStatusUpdate
    ): Response<RideRequest>

    @PUT("ride-requests/{id}/approve")
    suspend fun approveRideRequest(@Path("id") id: String): Response<RideRequest>

    @PUT("ride-requests/{id}/assign")
    suspend fun assignRideRequest(
        @Path("id") id: String,
        @Body assignment: AssignRideRequest
    ): Response<RideRequest>

    @PUT("ride-requests/{id}/reject")
    suspend fun rejectRideRequest(
        @Path("id") id: String,
        @Body request: RejectRideRequest
    ): Response<RideRequest>

    // Notifications (server returns direct array)
    @GET("notifications")
    suspend fun getNotifications(): Response<List<AppNotification>>

    @GET("notifications/unread-count")
    suspend fun getUnreadCount(): Response<UnreadCountResponse>

    @PUT("notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: String): Response<AppNotification>

    @PUT("notifications/read-all")
    suspend fun markAllNotificationsRead(): Response<Any>

    // Vehicles
    @GET("vehicles")
    suspend fun getVehicles(): Response<List<Vehicle>>

    @POST("vehicles")
    suspend fun createVehicle(@Body request: CreateVehicleRequest): Response<VehicleResponse>

    @PUT("vehicles/{id}")
    suspend fun updateVehicle(
        @Path("id") id: String,
        @Body request: UpdateVehicleRequest
    ): Response<VehicleResponse>

    @DELETE("vehicles/{id}")
    suspend fun deleteVehicle(@Path("id") id: String): Response<Any>

    // Drivers
    @GET("drivers")
    suspend fun getDrivers(): Response<List<Driver>>

    // Analytics & Reports
    @GET("analytics/dashboard")
    suspend fun getAnalyticsDashboard(
        @Query("from") from: String? = null,
        @Query("to") to: String? = null
    ): Response<AnalyticsDashboard>

    @GET("analytics/driver-performance")
    suspend fun getDriverPerformance(): Response<List<DriverPerformance>>

    @GET("analytics/costs")
    suspend fun getAnalyticsCosts(
        @Query("from") from: String? = null,
        @Query("to") to: String? = null
    ): Response<CostAnalytics>

    @GET("reports/daily")
    suspend fun getDailyReport(@Query("date") date: String): Response<DailyReport>

    @GET("reports/timecards")
    suspend fun getTimecards(
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String
    ): Response<List<TimecardEntry>>

    @GET("reports/vehicle-utilization")
    suspend fun getVehicleUtilization(
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String
    ): Response<List<VehicleUtilization>>

    @GET("reports/on-time")
    suspend fun getOnTimeReport(
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String
    ): Response<OnTimeReport>

    @GET("reports/cost-analysis")
    suspend fun getCostAnalysis(
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String
    ): Response<CostAnalysisReport>

    @GET("reports/overtime")
    suspend fun getOvertimeReport(
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String
    ): Response<List<OvertimeEntry>>

    // Maintenance
    @GET("maintenance")
    suspend fun getMaintenance(
        @Query("vehicleId") vehicleId: String? = null,
        @Query("status") status: String? = null
    ): Response<List<MaintenanceRecord>>

    @GET("maintenance/alerts")
    suspend fun getMaintenanceAlerts(): Response<List<MaintenanceRecord>>

    @POST("maintenance")
    suspend fun createMaintenance(@Body body: Map<String, @JvmSuppressWildcards Any>): Response<MaintenanceRecord>

    @PUT("maintenance/{id}")
    suspend fun updateMaintenance(
        @Path("id") id: String,
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): Response<MaintenanceRecord>

    @DELETE("maintenance/{id}")
    suspend fun deleteMaintenance(@Path("id") id: String): Response<Any>

    // Ratings
    @POST("ratings")
    suspend fun submitRating(@Body body: Map<String, @JvmSuppressWildcards Any>): Response<Any>

    @GET("ratings/user/{userId}")
    suspend fun getUserRatings(@Path("userId") userId: String): Response<List<RatingEntry>>

    @GET("ratings/trip/{tripId}/check")
    suspend fun checkTripRating(@Path("tripId") tripId: String): Response<RatingCheck>

    // Allocations (PA system)
    @GET("allocations")
    suspend fun getAllocations(): Response<List<AllocationEntry>>

    @GET("allocations/my-driver")
    suspend fun getMyDriver(): Response<AllocationDriver>

    @PUT("allocations/{driverId}/allocate")
    suspend fun allocateDriver(
        @Path("driverId") driverId: String,
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): Response<Any>

    @PUT("allocations/{driverId}/release-temp")
    suspend fun releaseTempDriver(
        @Path("driverId") driverId: String,
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): Response<Any>

    @PUT("allocations/{driverId}/recall")
    suspend fun recallDriver(@Path("driverId") driverId: String): Response<Any>

    @DELETE("allocations/{driverId}")
    suspend fun removeAllocation(@Path("driverId") driverId: String): Response<Any>

    // Ride Request additional endpoints
    @POST("ride-requests/call")
    suspend fun callPADriver(@Body body: Map<String, @JvmSuppressWildcards Any>): Response<RideRequest>

    @POST("ride-requests/call/{actorId}")
    suspend fun callPADriverForActor(
        @Path("actorId") actorId: String,
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): Response<RideRequest>

    @POST("ride-requests/bulk")
    suspend fun bulkCreateRideRequests(@Body body: List<Map<String, @JvmSuppressWildcards Any>>): Response<Any>

    @GET("ride-requests/active-cars")
    suspend fun getActiveCars(): Response<List<ActiveCar>>

    @GET("ride-requests/history")
    suspend fun getRideRequestHistory(@Query("date") date: String? = null): Response<List<RideRequest>>

    @PUT("ride-requests/{id}/add-stop")
    suspend fun addRideStop(
        @Path("id") id: String,
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): Response<RideRequest>

    @PUT("ride-requests/{id}/complete-stop/{stopIndex}")
    suspend fun completeRideStop(
        @Path("id") id: String,
        @Path("stopIndex") stopIndex: Int
    ): Response<RideRequest>

    @PUT("ride-requests/{id}/add-passenger")
    suspend fun addRidePassenger(
        @Path("id") id: String,
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): Response<RideRequest>

    @DELETE("ride-requests/{id}")
    suspend fun cancelRideRequest(@Path("id") id: String): Response<Any>

    // Auth additional
    @POST("auth/register")
    suspend fun register(@Body body: Map<String, @JvmSuppressWildcards Any>): Response<LoginResponse>

    @POST("auth/refresh")
    suspend fun refreshToken(@Body body: Map<String, @JvmSuppressWildcards Any>): Response<LoginResponse>

    @GET("auth/me")
    suspend fun getMe(): Response<User>

    @GET("auth/users")
    suspend fun getUsers(@Query("role") role: String? = null): Response<List<User>>

    // Shuttles
    @GET("shuttles/routes")
    suspend fun getShuttleRoutes(): Response<List<ShuttleRoute>>

    @GET("shuttles/schedule")
    suspend fun getShuttleSchedule(): Response<List<ShuttleRun>>

    @GET("shuttles/active")
    suspend fun getActiveShuttles(): Response<List<ShuttleRun>>

    @POST("shuttles/routes")
    suspend fun createShuttleRoute(@Body body: Map<String, @JvmSuppressWildcards Any>): Response<ShuttleRoute>

    @PUT("shuttles/routes/{id}")
    suspend fun updateShuttleRoute(
        @Path("id") id: String,
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): Response<ShuttleRoute>

    @DELETE("shuttles/routes/{id}")
    suspend fun deleteShuttleRoute(@Path("id") id: String): Response<Any>

    @POST("shuttles/runs")
    suspend fun createShuttleRun(@Body body: Map<String, @JvmSuppressWildcards Any>): Response<ShuttleRun>

    @PUT("shuttles/runs/{id}")
    suspend fun updateShuttleRun(
        @Path("id") id: String,
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): Response<ShuttleRun>

    @POST("shuttles/routes/{id}/generate")
    suspend fun generateShuttleRuns(@Path("id") id: String): Response<Any>

    // Templates
    @GET("templates")
    suspend fun getTripTemplates(): Response<List<TripTemplate>>

    @POST("templates")
    suspend fun createTripTemplate(@Body body: Map<String, @JvmSuppressWildcards Any>): Response<TripTemplate>

    @POST("templates/from-trip/{tripId}")
    suspend fun createTemplateFromTrip(
        @Path("tripId") tripId: String,
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): Response<TripTemplate>

    @POST("templates/{id}/create-trip")
    suspend fun createTripFromTemplate(@Path("id") id: String): Response<Any>

    @PUT("templates/{id}")
    suspend fun updateTripTemplate(
        @Path("id") id: String,
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): Response<TripTemplate>

    @DELETE("templates/{id}")
    suspend fun deleteTripTemplate(@Path("id") id: String): Response<Any>

    @GET("day-templates")
    suspend fun getDayTemplates(): Response<List<DayTemplate>>

    @POST("day-templates/capture")
    suspend fun captureDayTemplate(@Body body: Map<String, @JvmSuppressWildcards Any>): Response<DayTemplate>

    @POST("day-templates/{id}/apply")
    suspend fun applyDayTemplate(@Path("id") id: String): Response<Any>

    @DELETE("day-templates/{id}")
    suspend fun deleteDayTemplate(@Path("id") id: String): Response<Any>

    // Chat (server returns direct arrays)
    @GET("chat/conversations")
    suspend fun getConversations(): Response<List<Conversation>>

    @GET("chat/contacts")
    suspend fun getContacts(): Response<List<ContactUser>>

    @GET("chat/messages/{userId}")
    suspend fun getMessages(
        @Path("userId") userId: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<List<ChatMessage>>

    @POST("chat/messages")
    suspend fun sendMessage(@Body request: SendMessageRequest): Response<ChatMessage>

    @GET("drivers/available")
    suspend fun getAvailableDrivers(): Response<List<Driver>>

    @PUT("drivers/{id}/availability")
    suspend fun toggleDriverAvailability(
        @Path("id") id: String,
        @Body update: AvailabilityUpdate
    ): Response<DriverResponse>

    @POST("drivers/temporary")
    suspend fun createTempDriver(@Body request: CreateTempDriverRequest): Response<DriverResponse>

    // Talent
    @GET("talent")
    suspend fun getTalentProfiles(): Response<List<TalentProfile>>

    @POST("talent")
    suspend fun createTalentProfile(@Body body: Map<String, @JvmSuppressWildcards Any>): Response<TalentProfile>

    @PUT("talent/{id}")
    suspend fun updateTalentProfile(
        @Path("id") id: String,
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): Response<TalentProfile>

    @POST("talent/{id}/traveling")
    suspend fun markTalentTraveling(@Path("id") id: String): Response<TalentProfile>

    @POST("talent/{id}/arrived")
    suspend fun markTalentArrived(@Path("id") id: String): Response<TalentProfile>

    @DELETE("talent/{id}")
    suspend fun deleteTalentProfile(@Path("id") id: String): Response<Any>

    // Permanent Trips
    @GET("permanent-trips")
    suspend fun getPermanentTrips(@Query("status") status: String? = null): Response<List<PermanentTrip>>
    // Note: server returns direct array for all list endpoints

    @GET("permanent-trips/{id}")
    suspend fun getPermanentTrip(@Path("id") id: String): Response<PermanentTrip>

    @POST("permanent-trips")
    suspend fun createPermanentTrip(@Body request: CreatePermanentTripRequest): Response<PermanentTrip>

    @PUT("permanent-trips/{id}")
    suspend fun updatePermanentTrip(@Path("id") id: String, @Body body: Map<String, @JvmSuppressWildcards Any>): Response<PermanentTrip>

    @PUT("permanent-trips/{id}/swap-driver")
    suspend fun swapPermanentTripDriver(@Path("id") id: String, @Body request: SwapDriverRequest): Response<PermanentTrip>

    @PUT("permanent-trips/{id}/swap-vehicle")
    suspend fun swapPermanentTripVehicle(@Path("id") id: String, @Body request: SwapVehicleRequest): Response<PermanentTrip>

    @PUT("permanent-trips/{id}/activate")
    suspend fun activatePermanentTrip(@Path("id") id: String): Response<PermanentTrip>

    @PUT("permanent-trips/{id}/pause")
    suspend fun pausePermanentTrip(@Path("id") id: String): Response<PermanentTrip>

    @DELETE("permanent-trips/{id}")
    suspend fun deletePermanentTrip(@Path("id") id: String): Response<Any>
}

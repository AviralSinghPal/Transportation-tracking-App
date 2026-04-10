package com.transporthq.app.data.models

import com.google.gson.annotations.SerializedName

data class AnalyticsDashboard(
    val totalTrips: Int = 0,
    val completedTrips: Int = 0,
    val cancelledTrips: Int = 0,
    val activeTrips: Int = 0,
    val completionRate: Double = 0.0,
    val totalCost: Double = 0.0,
    val totalMiles: Double = 0.0,
    val averageTripDuration: Double = 0.0,
    val tripsByDay: List<TripsByDay> = emptyList(),
    val tripsByStatus: List<TripsByStatus> = emptyList()
)

data class TripsByDay(val date: String = "", val count: Int = 0)
data class TripsByStatus(val status: String = "", val count: Int = 0)

data class DriverPerformance(
    @SerializedName("_id") val id: String = "",
    val name: String = "",
    val totalTrips: Int = 0,
    val completedTrips: Int = 0,
    val cancelledTrips: Int = 0,
    val averageRating: Double = 0.0,
    val totalMiles: Double = 0.0,
    val onTimeRate: Double = 0.0
)

data class CostAnalytics(
    val totalCost: Double = 0.0,
    val averageCostPerTrip: Double = 0.0,
    val costByDay: List<CostByDay> = emptyList()
)

data class CostByDay(val date: String = "", val cost: Double = 0.0)

data class DailyReport(
    val date: String = "",
    val totalTrips: Int = 0,
    val completedTrips: Int = 0,
    val totalRideRequests: Int = 0,
    val activeDrivers: Int = 0,
    val totalMiles: Double = 0.0,
    val totalCost: Double = 0.0,
    val trips: List<Trip> = emptyList()
)

data class TimecardEntry(
    val driverId: String = "",
    val driverName: String = "",
    val totalHours: Double = 0.0,
    val trips: Int = 0,
    val date: String = ""
)

data class VehicleUtilization(
    val vehicleId: String = "",
    val vehicleName: String = "",
    val totalTrips: Int = 0,
    val totalMiles: Double = 0.0,
    val utilizationRate: Double = 0.0
)

data class OnTimeReport(
    val totalTrips: Int = 0,
    val onTimeTrips: Int = 0,
    val lateTrips: Int = 0,
    val onTimeRate: Double = 0.0
)

data class CostAnalysisReport(
    val totalCost: Double = 0.0,
    val averageCostPerTrip: Double = 0.0,
    val costByVehicle: List<CostByVehicle> = emptyList()
)

data class CostByVehicle(val vehicleName: String = "", val cost: Double = 0.0)

data class OvertimeEntry(
    val driverName: String = "",
    val regularHours: Double = 0.0,
    val overtimeHours: Double = 0.0,
    val date: String = ""
)

data class MaintenanceRecord(
    @SerializedName("_id") val id: String = "",
    val vehicle: VehicleRef? = null,
    val type: String = "",
    val title: String = "",
    val description: String = "",
    val status: String = "scheduled",
    val scheduledDate: String? = null,
    val completedDate: String? = null,
    val cost: Double = 0.0,
    val performedBy: String = "",
    val notes: String = "",
    val createdAt: String? = null
)

data class RatingEntry(
    @SerializedName("_id") val id: String = "",
    val rating: Int = 0,
    val comment: String = "",
    val type: String = "",
    val ratedBy: PassengerRef? = null,
    val createdAt: String? = null
)

data class RatingCheck(
    val hasRated: Boolean = false
)

data class AllocationEntry(
    val driver: DriverRef? = null,
    val passenger: PassengerRef? = null,
    val status: String = "",
    val allocatedAt: String? = null
)

data class AllocationDriver(
    val driver: DriverRef? = null,
    val isAllocated: Boolean = false
)

data class ActiveCar(
    @SerializedName("_id") val id: String = "",
    val name: String = "",
    val driverName: String = "",
    val status: String = "",
    val availableSeats: Int = 0,
    val currentLocation: Coordinates? = null
)

data class ShuttleRoute(
    @SerializedName("_id") val id: String = "",
    val name: String = "",
    val type: String = "crew",
    val stops: List<ShuttleStop> = emptyList(),
    val frequency: Int = 30,
    val startTime: String = "",
    val endTime: String = "",
    val capacity: Int = 20,
    val assignedVehicle: VehicleRef? = null,
    val assignedDriver: DriverRef? = null,
    val isActive: Boolean = true,
    val daysActive: List<String> = emptyList(),
    val notes: String = "",
    val createdAt: String? = null
)

data class ShuttleStop(
    val name: String = "",
    val address: String = "",
    val lat: Double = 0.0,
    val lng: Double = 0.0,
    val estimatedTime: String = "",
    val order: Int = 0
)

data class ShuttleRun(
    @SerializedName("_id") val id: String = "",
    val route: ShuttleRoute? = null,
    val driver: DriverRef? = null,
    val vehicle: VehicleRef? = null,
    val scheduledDeparture: Long = 0,
    val status: String = "scheduled",
    val occupancy: Int = 0,
    val capacity: Int = 20,
    val createdAt: String? = null
)

data class TripTemplate(
    @SerializedName("_id") val id: String = "",
    val name: String = "",
    val description: String = "",
    val pickupLocation: String = "",
    val dropoffLocation: String = "",
    val driverId: String? = null,
    val vehicleId: String? = null,
    val notes: String = "",
    val createdAt: String? = null
)

data class DayTemplate(
    @SerializedName("_id") val id: String = "",
    val name: String = "",
    val description: String = "",
    val sourceDate: Long = 0,
    val entries: List<DayTemplateEntry> = emptyList(),
    val usageCount: Int = 0,
    val createdAt: String? = null
)

data class DayTemplateEntry(
    val type: String = "",
    val title: String = "",
    val pickupLocation: String = "",
    val dropoffLocation: String = "",
    val pickupTime: String = "",
    val passengerCount: Int = 1
)

import Foundation

struct AnalyticsDashboard: Codable {
    let totalTrips: Int?
    let completedTrips: Int?
    let cancelledTrips: Int?
    let activeTrips: Int?
    let completionRate: Double?
    let totalCost: Double?
    let totalMiles: Double?
    let averageTripDuration: Double?
    let tripsByDay: [TripsByDayEntry]?
    let tripsByStatus: [TripsByStatusEntry]?
}

struct TripsByDayEntry: Codable { let date: String?; let count: Int? }
struct TripsByStatusEntry: Codable { let status: String?; let count: Int? }

struct DriverPerformanceEntry: Codable, Identifiable {
    let id: String
    let name: String?
    let totalTrips: Int?
    let completedTrips: Int?
    let cancelledTrips: Int?
    let averageRating: Double?
    let totalMiles: Double?
    let onTimeRate: Double?
    enum CodingKeys: String, CodingKey { case id = "_id"; case name, totalTrips, completedTrips, cancelledTrips, averageRating, totalMiles, onTimeRate }
}

struct DailyReportData: Codable {
    let date: String?; let totalTrips: Int?; let completedTrips: Int?
    let totalRideRequests: Int?; let activeDrivers: Int?; let totalMiles: Double?; let totalCost: Double?
}

struct TimecardEntryData: Codable, Identifiable {
    var id: String { driverId ?? UUID().uuidString }
    let driverId: String?; let driverName: String?; let totalHours: Double?; let trips: Int?; let date: String?
}

struct VehicleUtilizationData: Codable, Identifiable {
    var id: String { vehicleId ?? UUID().uuidString }
    let vehicleId: String?; let vehicleName: String?; let totalTrips: Int?; let totalMiles: Double?; let utilizationRate: Double?
}

struct CostAnalysisData: Codable {
    let totalCost: Double?; let averageCostPerTrip: Double?
}

struct MaintenanceRecordData: Codable, Identifiable {
    let id: String
    let vehicle: MaintenanceVehicle?; let type: String?; let title: String?; let description: String?
    let status: String?; let scheduledDate: String?; let completedDate: String?; let cost: Double?
    let performedBy: String?; let notes: String?; let createdAt: String?
    enum CodingKeys: String, CodingKey { case id = "_id"; case vehicle, type, title, description, status, scheduledDate, completedDate, cost, performedBy, notes, createdAt }
}

struct MaintenanceVehicle: Codable {
    let id: String?; let name: String?; let plateNumber: String?
    enum CodingKeys: String, CodingKey { case id = "_id"; case name, plateNumber }
}

struct RatingEntryData: Codable, Identifiable {
    let id: String; let rating: Int?; let comment: String?; let type: String?; let createdAt: String?
    enum CodingKeys: String, CodingKey { case id = "_id"; case rating, comment, type, createdAt }
}

struct RatingCheckData: Codable { let hasRated: Bool? }

struct AllocationEntryData: Codable, Identifiable {
    var id: String { driver?.id ?? UUID().uuidString }
    let driver: AllocationDriverRef?; let passenger: AllocationPassengerRef?; let status: String?; let allocatedAt: String?
}

struct AllocationDriverRef: Codable {
    let id: String?; let name: String?; let phone: String?
    enum CodingKeys: String, CodingKey { case id = "_id"; case name, phone }
}

struct AllocationPassengerRef: Codable {
    let id: String?; let name: String?
    enum CodingKeys: String, CodingKey { case id = "_id"; case name }
}

struct AllocationDriverData: Codable {
    let driver: AllocationDriverRef?; let isAllocated: Bool?
}

struct ActiveCarData: Codable, Identifiable {
    let id: String; let name: String?; let driverName: String?; let status: String?; let availableSeats: Int?
    enum CodingKeys: String, CodingKey { case id = "_id"; case name, driverName, status, availableSeats }
}

struct ShuttleRouteData: Codable, Identifiable {
    let id: String; let name: String?; let type: String?; let stops: [ShuttleStopData]?
    let frequency: Int?; let startTime: String?; let endTime: String?; let capacity: Int?
    let isActive: Bool?; let daysActive: [String]?; let notes: String?; let createdAt: String?
    enum CodingKeys: String, CodingKey { case id = "_id"; case name, type, stops, frequency, startTime, endTime, capacity, isActive, daysActive, notes, createdAt }
}

struct ShuttleStopData: Codable { let name: String?; let address: String?; let estimatedTime: String?; let order: Int? }

struct ShuttleRunData: Codable, Identifiable {
    let id: String; let route: ShuttleRouteData?; let status: String?; let occupancy: Int?; let capacity: Int?; let createdAt: String?
    enum CodingKeys: String, CodingKey { case id = "_id"; case route, status, occupancy, capacity, createdAt }
}

struct TripTemplateData: Codable, Identifiable {
    let id: String; let name: String?; let description: String?; let pickupLocation: String?; let dropoffLocation: String?; let createdAt: String?
    enum CodingKeys: String, CodingKey { case id = "_id"; case name, description, pickupLocation, dropoffLocation, createdAt }
}

struct DayTemplateData: Codable, Identifiable {
    let id: String; let name: String?; let description: String?; let usageCount: Int?; let createdAt: String?
    enum CodingKeys: String, CodingKey { case id = "_id"; case name, description, usageCount, createdAt }
}

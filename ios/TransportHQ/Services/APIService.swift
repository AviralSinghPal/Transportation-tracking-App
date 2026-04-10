import Foundation

final class APIService {
    static let shared = APIService()
    private let baseURL = "http://localhost:5001/api"
    private var token: String?

    private init() {}

    func setToken(_ token: String?) {
        self.token = token
    }

    // MARK: - Auth
    func login(email: String, password: String) async throws -> AuthResponse {
        let body = LoginRequest(email: email, password: password)
        return try await post("\(baseURL)/auth/login", body: body)
    }

    // MARK: - Trips
    func getTrips(date: String? = nil) async throws -> [Trip] {
        var url = "\(baseURL)/trips"
        if let date = date {
            url += "?date=\(date)"
        }
        return try await get(url)
    }

    func getTripDetail(id: String) async throws -> TripDetailResponse {
        return try await get("\(baseURL)/trips/\(id)")
    }

    func createTrip(body: [String: Any]) async throws -> Trip {
        return try await postRaw("\(baseURL)/trips", body: body)
    }

    func assignTrip(id: String, driverId: String, vehicleId: String) async throws -> Trip {
        let body: [String: Any] = ["driverId": driverId, "vehicleId": vehicleId]
        return try await putRaw("\(baseURL)/trips/\(id)/assign", body: body)
    }

    func cancelTrip(id: String) async throws {
        guard let url = URL(string: "\(baseURL)/trips/\(id)") else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        addAuthHeader(&request)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw APIError.serverError(statusCode: (response as? HTTPURLResponse)?.statusCode ?? 0, message: errorBody)
        }
    }

    func updateTripStatus(tripId: String, status: String, location: GeoPoint? = nil) async throws -> Trip {
        var body: [String: Any] = ["status": status]
        if let location = location {
            body["location"] = ["lat": location.lat ?? 0, "lng": location.lng ?? 0]
        }
        return try await putRaw("\(baseURL)/trips/\(tripId)/status", body: body)
    }

    // MARK: - Ride Requests
    func getRideRequests() async throws -> [RideRequest] {
        return try await get("\(baseURL)/ride-requests")
    }

    func getRideRequest(id: String) async throws -> RideRequest {
        return try await get("\(baseURL)/ride-requests/\(id)")
    }

    func createRideRequest(pickup: String, dropoff: String, pickupTime: String, passengerCount: Int, priority: String, department: String, notes: String) async throws -> RideRequest {
        let body: [String: Any] = [
            "pickupLocation": pickup,
            "dropoffLocation": dropoff,
            "pickupTime": pickupTime,
            "passengerCount": passengerCount,
            "priority": priority,
            "department": department,
            "notes": notes
        ]
        return try await postRaw("\(baseURL)/ride-requests", body: body)
    }

    func updateRideRequestStatus(id: String, status: String) async throws -> RideRequest {
        let body = ["status": status]
        return try await putRaw("\(baseURL)/ride-requests/\(id)/status", body: body)
    }

    func approveRideRequest(id: String) async throws -> RideRequest {
        return try await putRaw("\(baseURL)/ride-requests/\(id)/approve", body: [:] as [String: String])
    }

    func assignRideRequest(id: String, driverId: String, vehicleId: String, eta: Int = 15) async throws -> RideRequest {
        let body: [String: Any] = [
            "driverId": driverId,
            "vehicleId": vehicleId,
            "eta": eta
        ]
        return try await putRaw("\(baseURL)/ride-requests/\(id)/assign", body: body)
    }

    func rejectRideRequest(id: String, reason: String) async throws -> RideRequest {
        let body: [String: Any] = ["reason": reason]
        return try await putRaw("\(baseURL)/ride-requests/\(id)/reject", body: body)
    }

    // MARK: - Notifications
    func getNotifications() async throws -> [AppNotification] {
        return try await get("\(baseURL)/notifications")
    }

    func getUnreadCount() async throws -> UnreadCountResponse {
        return try await get("\(baseURL)/notifications/unread-count")
    }

    func markNotificationRead(id: String) async throws -> AppNotification {
        return try await putRaw("\(baseURL)/notifications/\(id)/read", body: [:] as [String: String])
    }

    func markAllNotificationsRead() async throws -> [String: Any] {
        return try await putRawJSON("\(baseURL)/notifications/read-all", body: [:] as [String: String])
    }

    // MARK: - Vehicles
    func getVehicles() async throws -> [Vehicle] {
        return try await get("\(baseURL)/vehicles")
    }

    func createVehicle(body: [String: Any]) async throws -> Vehicle {
        return try await postRaw("\(baseURL)/vehicles", body: body)
    }

    func updateVehicle(id: String, body: [String: Any]) async throws -> Vehicle {
        return try await putRaw("\(baseURL)/vehicles/\(id)", body: body)
    }

    func deleteVehicle(id: String) async throws {
        guard let url = URL(string: "\(baseURL)/vehicles/\(id)") else {
            throw APIError.invalidURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        addAuthHeader(&request)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw APIError.serverError(statusCode: (response as? HTTPURLResponse)?.statusCode ?? 0, message: errorBody)
        }
    }

    // MARK: - Drivers
    func getDrivers() async throws -> [Driver] {
        return try await get("\(baseURL)/drivers")
    }

    // MARK: - Chat
    func getConversations() async throws -> [Conversation] {
        return try await get("\(baseURL)/chat/conversations")
    }

    func getContacts() async throws -> [ChatContact] {
        return try await get("\(baseURL)/chat/contacts")
    }

    func getMessages(userId: String, page: Int = 1) async throws -> [ChatMessage] {
        return try await get("\(baseURL)/chat/messages/\(userId)?page=\(page)&limit=50")
    }

    func sendMessage(receiverId: String, message: String, tripId: String? = nil) async throws -> ChatMessage {
        var body: [String: Any] = ["receiverId": receiverId, "message": message]
        if let tripId = tripId { body["tripId"] = tripId }
        return try await postRaw("\(baseURL)/chat/messages", body: body)
    }

    func getAvailableDrivers() async throws -> [Driver] {
        return try await get("\(baseURL)/drivers/available")
    }

    func toggleDriverAvailability(id: String, isAvailable: Bool) async throws -> Driver {
        let body: [String: Any] = ["isAvailable": isAvailable]
        return try await putRaw("\(baseURL)/drivers/\(id)/availability", body: body)
    }

    func createTempDriver(name: String, phone: String, licenseNumber: String?) async throws -> Driver {
        var body: [String: Any] = ["name": name, "phone": phone]
        if let license = licenseNumber { body["licenseNumber"] = license }
        return try await postRaw("\(baseURL)/drivers/temporary", body: body)
    }

    // MARK: - Permanent Trips
    func getPermanentTrips(status: String? = nil) async throws -> [PermanentTrip] {
        var url = "\(baseURL)/permanent-trips"
        if let status = status { url += "?status=\(status)" }
        return try await get(url)
    }

    func createPermanentTrip(body: [String: Any]) async throws -> PermanentTrip {
        return try await postRaw("\(baseURL)/permanent-trips", body: body)
    }

    func swapPermanentTripDriver(id: String, newDriverId: String?, reason: String) async throws -> PermanentTrip {
        var body: [String: Any] = ["reason": reason]
        if let driverId = newDriverId { body["newDriverId"] = driverId }
        return try await putRaw("\(baseURL)/permanent-trips/\(id)/swap-driver", body: body)
    }

    func swapPermanentTripVehicle(id: String, newVehicleId: String?, reason: String) async throws -> PermanentTrip {
        var body: [String: Any] = ["reason": reason]
        if let vehicleId = newVehicleId { body["newVehicleId"] = vehicleId }
        return try await putRaw("\(baseURL)/permanent-trips/\(id)/swap-vehicle", body: body)
    }

    func activatePermanentTrip(id: String) async throws -> PermanentTrip {
        return try await putRaw("\(baseURL)/permanent-trips/\(id)/activate", body: [:] as [String: String])
    }

    func pausePermanentTrip(id: String) async throws -> PermanentTrip {
        return try await putRaw("\(baseURL)/permanent-trips/\(id)/pause", body: [:] as [String: String])
    }

    func deletePermanentTrip(id: String) async throws {
        guard let url = URL(string: "\(baseURL)/permanent-trips/\(id)") else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        addAuthHeader(&request)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(statusCode: (response as? HTTPURLResponse)?.statusCode ?? 0, message: String(data: data, encoding: .utf8) ?? "")
        }
    }

    // MARK: - Talent
    func getTalentProfiles() async throws -> [TalentProfileData] {
        return try await get("\(baseURL)/talent")
    }

    func createTalentProfile(body: [String: Any]) async throws -> TalentProfileData {
        return try await postRaw("\(baseURL)/talent", body: body)
    }

    func updateTalentProfile(id: String, body: [String: Any]) async throws -> TalentProfileData {
        return try await putRaw("\(baseURL)/talent/\(id)", body: body)
    }

    func markTalentTraveling(id: String) async throws -> TalentProfileData {
        return try await postRaw("\(baseURL)/talent/\(id)/traveling", body: [:] as [String: String])
    }

    func markTalentArrived(id: String) async throws -> TalentProfileData {
        return try await postRaw("\(baseURL)/talent/\(id)/arrived", body: [:] as [String: String])
    }

    func deleteTalentProfile(id: String) async throws {
        guard let url = URL(string: "\(baseURL)/talent/\(id)") else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        addAuthHeader(&request)
        let (_, _) = try await URLSession.shared.data(for: request)
    }

    // MARK: - Analytics & Reports
    func getAnalyticsDashboard(from: String? = nil, to: String? = nil) async throws -> AnalyticsDashboard {
        var url = "\(baseURL)/analytics/dashboard"
        var params: [String] = []
        if let from = from { params.append("from=\(from)") }
        if let to = to { params.append("to=\(to)") }
        if !params.isEmpty { url += "?\(params.joined(separator: "&"))" }
        return try await get(url)
    }

    func getDriverPerformance() async throws -> [DriverPerformanceEntry] {
        return try await get("\(baseURL)/analytics/driver-performance")
    }

    func getDailyReport(date: String) async throws -> DailyReportData {
        return try await get("\(baseURL)/reports/daily?date=\(date)")
    }

    func getTimecards(startDate: String, endDate: String) async throws -> [TimecardEntryData] {
        return try await get("\(baseURL)/reports/timecards?startDate=\(startDate)&endDate=\(endDate)")
    }

    func getVehicleUtilization(startDate: String, endDate: String) async throws -> [VehicleUtilizationData] {
        return try await get("\(baseURL)/reports/vehicle-utilization?startDate=\(startDate)&endDate=\(endDate)")
    }

    func getCostAnalysis(startDate: String, endDate: String) async throws -> CostAnalysisData {
        return try await get("\(baseURL)/reports/cost-analysis?startDate=\(startDate)&endDate=\(endDate)")
    }

    // MARK: - Maintenance
    func getMaintenance(vehicleId: String? = nil, status: String? = nil) async throws -> [MaintenanceRecordData] {
        var url = "\(baseURL)/maintenance"
        var params: [String] = []
        if let v = vehicleId { params.append("vehicleId=\(v)") }
        if let s = status { params.append("status=\(s)") }
        if !params.isEmpty { url += "?\(params.joined(separator: "&"))" }
        return try await get(url)
    }

    func getMaintenanceAlerts() async throws -> [MaintenanceRecordData] {
        return try await get("\(baseURL)/maintenance/alerts")
    }

    func createMaintenance(body: [String: Any]) async throws -> MaintenanceRecordData {
        return try await postRaw("\(baseURL)/maintenance", body: body)
    }

    func updateMaintenance(id: String, body: [String: Any]) async throws -> MaintenanceRecordData {
        return try await putRaw("\(baseURL)/maintenance/\(id)", body: body)
    }

    func deleteMaintenance(id: String) async throws {
        guard let url = URL(string: "\(baseURL)/maintenance/\(id)") else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        addAuthHeader(&request)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(statusCode: (response as? HTTPURLResponse)?.statusCode ?? 0, message: String(data: data, encoding: .utf8) ?? "")
        }
    }

    // MARK: - Ratings
    func submitRating(body: [String: Any]) async throws -> [String: Any] {
        return try await postRawJSON("\(baseURL)/ratings", body: body)
    }

    func getUserRatings(userId: String) async throws -> [RatingEntryData] {
        return try await get("\(baseURL)/ratings/user/\(userId)")
    }

    func checkTripRating(tripId: String) async throws -> RatingCheckData {
        return try await get("\(baseURL)/ratings/trip/\(tripId)/check")
    }

    // MARK: - Allocations (PA system)
    func getAllocations() async throws -> [AllocationEntryData] {
        return try await get("\(baseURL)/allocations")
    }

    func getMyDriver() async throws -> AllocationDriverData {
        return try await get("\(baseURL)/allocations/my-driver")
    }

    func allocateDriver(driverId: String, body: [String: Any]) async throws -> [String: Any] {
        return try await putRawJSON("\(baseURL)/allocations/\(driverId)/allocate", body: body)
    }

    func releaseTempDriver(driverId: String, note: String) async throws -> [String: Any] {
        return try await putRawJSON("\(baseURL)/allocations/\(driverId)/release-temp", body: ["note": note])
    }

    func recallDriver(driverId: String) async throws -> [String: Any] {
        return try await putRawJSON("\(baseURL)/allocations/\(driverId)/recall", body: [:] as [String: String])
    }

    func removeAllocation(driverId: String) async throws {
        guard let url = URL(string: "\(baseURL)/allocations/\(driverId)") else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        addAuthHeader(&request)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(statusCode: (response as? HTTPURLResponse)?.statusCode ?? 0, message: String(data: data, encoding: .utf8) ?? "")
        }
    }

    // MARK: - Ride Request additional
    func callPADriver(body: [String: Any]) async throws -> RideRequest {
        return try await postRaw("\(baseURL)/ride-requests/call", body: body)
    }

    func callPADriverForActor(actorId: String, body: [String: Any]) async throws -> RideRequest {
        return try await postRaw("\(baseURL)/ride-requests/call/\(actorId)", body: body)
    }

    func bulkCreateRideRequests(body: [[String: Any]]) async throws -> [String: Any] {
        guard let url = URL(string: "\(baseURL)/ride-requests/bulk") else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        addAuthHeader(&request)
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        return try await executeJSON(request)
    }

    func getActiveCars() async throws -> [ActiveCarData] {
        return try await get("\(baseURL)/ride-requests/active-cars")
    }

    func getRideRequestHistory(date: String? = nil) async throws -> [RideRequest] {
        var url = "\(baseURL)/ride-requests/history"
        if let date = date { url += "?date=\(date)" }
        return try await get(url)
    }

    func addRideStop(id: String, body: [String: Any]) async throws -> RideRequest {
        return try await putRaw("\(baseURL)/ride-requests/\(id)/add-stop", body: body)
    }

    func completeRideStop(id: String, stopIndex: Int) async throws -> RideRequest {
        return try await putRaw("\(baseURL)/ride-requests/\(id)/complete-stop/\(stopIndex)", body: [:] as [String: String])
    }

    func addRidePassenger(id: String, body: [String: Any]) async throws -> RideRequest {
        return try await putRaw("\(baseURL)/ride-requests/\(id)/add-passenger", body: body)
    }

    func cancelRideRequest(id: String) async throws {
        guard let url = URL(string: "\(baseURL)/ride-requests/\(id)") else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        addAuthHeader(&request)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(statusCode: (response as? HTTPURLResponse)?.statusCode ?? 0, message: String(data: data, encoding: .utf8) ?? "")
        }
    }

    // MARK: - Auth additional
    func register(body: [String: Any]) async throws -> AuthResponse {
        return try await postRaw("\(baseURL)/auth/register", body: body)
    }

    func refreshToken(refreshToken: String) async throws -> AuthResponse {
        return try await postRaw("\(baseURL)/auth/refresh", body: ["refreshToken": refreshToken])
    }

    func getMe() async throws -> User {
        return try await get("\(baseURL)/auth/me")
    }

    func getUsers(role: String? = nil) async throws -> [User] {
        var url = "\(baseURL)/auth/users"
        if let role = role { url += "?role=\(role)" }
        return try await get(url)
    }

    // MARK: - Shuttles
    func getShuttleRoutes() async throws -> [ShuttleRouteData] {
        return try await get("\(baseURL)/shuttles/routes")
    }

    func getShuttleSchedule() async throws -> [ShuttleRunData] {
        return try await get("\(baseURL)/shuttles/schedule")
    }

    func createShuttleRoute(body: [String: Any]) async throws -> ShuttleRouteData {
        return try await postRaw("\(baseURL)/shuttles/routes", body: body)
    }

    func updateShuttleRoute(id: String, body: [String: Any]) async throws -> ShuttleRouteData {
        return try await putRaw("\(baseURL)/shuttles/routes/\(id)", body: body)
    }

    func deleteShuttleRoute(id: String) async throws {
        guard let url = URL(string: "\(baseURL)/shuttles/routes/\(id)") else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        addAuthHeader(&request)
        let (_, _) = try await URLSession.shared.data(for: request)
    }

    // MARK: - Templates
    func getTripTemplates() async throws -> [TripTemplateData] {
        return try await get("\(baseURL)/templates")
    }

    func createTemplateFromTrip(tripId: String, name: String) async throws -> TripTemplateData {
        return try await postRaw("\(baseURL)/templates/from-trip/\(tripId)", body: ["name": name])
    }

    func createTripFromTemplate(id: String) async throws -> [String: Any] {
        return try await postRawJSON("\(baseURL)/templates/\(id)/create-trip", body: [:] as [String: String])
    }

    func deleteTripTemplate(id: String) async throws {
        guard let url = URL(string: "\(baseURL)/templates/\(id)") else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        addAuthHeader(&request)
        let (_, _) = try await URLSession.shared.data(for: request)
    }

    func getDayTemplates() async throws -> [DayTemplateData] {
        return try await get("\(baseURL)/day-templates")
    }

    func captureDayTemplate(name: String) async throws -> DayTemplateData {
        return try await postRaw("\(baseURL)/day-templates/capture", body: ["name": name])
    }

    func applyDayTemplate(id: String) async throws -> [String: Any] {
        return try await postRawJSON("\(baseURL)/day-templates/\(id)/apply", body: [:] as [String: String])
    }

    func deleteDayTemplate(id: String) async throws {
        guard let url = URL(string: "\(baseURL)/day-templates/\(id)") else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        addAuthHeader(&request)
        let (_, _) = try await URLSession.shared.data(for: request)
    }

    // MARK: - HTTP Methods
    private func get<T: Decodable>(_ urlString: String) async throws -> T {
        guard let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        addAuthHeader(&request)
        return try await execute(request)
    }

    private func post<T: Decodable, B: Encodable>(_ urlString: String, body: B) async throws -> T {
        guard let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        addAuthHeader(&request)
        request.httpBody = try JSONEncoder().encode(body)
        return try await execute(request)
    }

    private func postRaw<T: Decodable>(_ urlString: String, body: [String: Any]) async throws -> T {
        guard let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        addAuthHeader(&request)
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        return try await execute(request)
    }

    private func putRaw<T: Decodable>(_ urlString: String, body: [String: Any]) async throws -> T {
        guard let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        addAuthHeader(&request)
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        return try await execute(request)
    }

    private func postRawJSON(_ urlString: String, body: [String: Any]) async throws -> [String: Any] {
        guard let url = URL(string: urlString) else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        addAuthHeader(&request)
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        return try await executeJSON(request)
    }

    private func putRawJSON(_ urlString: String, body: [String: Any]) async throws -> [String: Any] {
        guard let url = URL(string: urlString) else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        addAuthHeader(&request)
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        return try await executeJSON(request)
    }

    private func executeJSON(_ request: URLRequest) async throws -> [String: Any] {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw APIError.serverError(statusCode: httpResponse.statusCode, message: errorBody)
        }
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return [:]
        }
        return json
    }

    private func addAuthHeader(_ request: inout URLRequest) {
        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
    }

    private func execute<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw APIError.serverError(statusCode: httpResponse.statusCode, message: errorBody)
        }

        let decoder = JSONDecoder()
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            print("Decode error for \(T.self): \(error)")
            print("Response body: \(String(data: data, encoding: .utf8) ?? "nil")")
            throw APIError.decodingError(error)
        }
    }
}

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case serverError(statusCode: Int, message: String)
    case decodingError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .serverError(let code, let message):
            return "Server error (\(code)): \(message)"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        }
    }
}

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

    func assignRideRequest(id: String, driverId: String, vehicleId: String, eta: String?) async throws -> RideRequest {
        var body: [String: Any] = [
            "driverId": driverId,
            "vehicleId": vehicleId
        ]
        if let eta = eta {
            body["eta"] = eta
        }
        return try await putRaw("\(baseURL)/ride-requests/\(id)/assign", body: body)
    }

    // MARK: - Vehicles
    func getVehicles() async throws -> [Vehicle] {
        return try await get("\(baseURL)/vehicles")
    }

    // MARK: - Drivers
    func getDrivers() async throws -> [Driver] {
        return try await get("\(baseURL)/drivers")
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

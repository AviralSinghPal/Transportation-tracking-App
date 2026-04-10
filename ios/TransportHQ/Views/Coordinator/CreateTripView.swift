import SwiftUI

struct CreateTripSheet: View {
    var onCreated: () -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var pickup = ""
    @State private var dropoff = ""
    @State private var notes = ""
    @State private var selectedDriverId = ""
    @State private var selectedVehicleId = ""
    @State private var drivers: [Driver] = []
    @State private var vehicles: [Vehicle] = []
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Trip Details") {
                    TextField("Trip Title", text: $title)
                    TextField("Pickup Location", text: $pickup)
                    TextField("Dropoff Location", text: $dropoff)
                    TextField("Notes (optional)", text: $notes)
                }

                Section("Assignment (optional)") {
                    Picker("Driver", selection: $selectedDriverId) {
                        Text("None").tag("")
                        ForEach(drivers) { driver in
                            Text(driver.fullName).tag(driver.id)
                        }
                    }

                    Picker("Vehicle", selection: $selectedVehicleId) {
                        Text("None").tag("")
                        ForEach(vehicles) { vehicle in
                            Text(vehicle.displayName).tag(vehicle.id)
                        }
                    }
                }

                if let error = errorMessage {
                    Section {
                        Text(error).foregroundColor(Theme.red).font(Theme.captionFont)
                    }
                }

                Section {
                    Button {
                        Task { await createTrip() }
                    } label: {
                        HStack {
                            Spacer()
                            if isSubmitting {
                                ProgressView().tint(.white)
                            } else {
                                Text("Create Trip").fontWeight(.semibold)
                            }
                            Spacer()
                        }
                    }
                    .listRowBackground(Theme.primary)
                    .foregroundColor(.white)
                    .disabled(title.isEmpty || pickup.isEmpty || dropoff.isEmpty || isSubmitting)
                }
            }
            .navigationTitle("Create Trip")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .task {
                do {
                    drivers = try await APIService.shared.getAvailableDrivers()
                    vehicles = try await APIService.shared.getVehicles()
                } catch {
                    print("Failed to load data: \(error)")
                }
            }
        }
    }

    func createTrip() async {
        isSubmitting = true
        errorMessage = nil

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        var body: [String: Any] = [
            "title": title,
            "date": formatter.string(from: Date()),
            "pickupLocation": pickup,
            "dropoffLocation": dropoff,
            "notes": notes
        ]
        if !selectedDriverId.isEmpty { body["driverId"] = selectedDriverId }
        if !selectedVehicleId.isEmpty { body["vehicleId"] = selectedVehicleId }

        do {
            let _: Trip = try await APIService.shared.createTrip(body: body)
            onCreated()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSubmitting = false
    }
}

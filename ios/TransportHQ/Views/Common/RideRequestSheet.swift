import SwiftUI

struct RideRequestSheet: View {
    @Environment(\.dismiss) private var dismiss
    let onSubmit: (String, String, Date, Int, String, String, String) async -> Void

    @State private var pickupLocation = ""
    @State private var dropoffLocation = ""
    @State private var pickupTime = Date().addingTimeInterval(3600)
    @State private var passengerCount = 1
    @State private var priority = "normal"
    @State private var department = ""
    @State private var notes = ""
    @State private var isSubmitting = false

    let priorities = ["low", "normal", "high", "urgent"]

    var isValid: Bool {
        !pickupLocation.isEmpty && !dropoffLocation.isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Locations") {
                    TextField("Pickup Location", text: $pickupLocation)
                    TextField("Dropoff Location", text: $dropoffLocation)
                }

                Section("Details") {
                    DatePicker("Pickup Time", selection: $pickupTime, in: Date()..., displayedComponents: [.date, .hourAndMinute])

                    Stepper("Passengers: \(passengerCount)", value: $passengerCount, in: 1...20)

                    Picker("Priority", selection: $priority) {
                        ForEach(priorities, id: \.self) { p in
                            Text(p.capitalized).tag(p)
                        }
                    }

                    TextField("Department", text: $department)
                }

                Section("Notes") {
                    TextEditor(text: $notes)
                        .frame(minHeight: 80)
                }

                Section {
                    Button {
                        isSubmitting = true
                        Task {
                            await onSubmit(pickupLocation, dropoffLocation, pickupTime, passengerCount, priority, department, notes)
                            isSubmitting = false
                        }
                    } label: {
                        HStack {
                            Spacer()
                            if isSubmitting {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text("Submit Request")
                                    .fontWeight(.semibold)
                            }
                            Spacer()
                        }
                    }
                    .listRowBackground(isValid ? Theme.primary : Theme.gray300)
                    .foregroundColor(.white)
                    .disabled(!isValid || isSubmitting)
                }
            }
            .navigationTitle("New Ride Request")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

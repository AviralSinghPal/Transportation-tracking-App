import SwiftUI

struct TripDetailView: View {
    let tripId: String
    @StateObject private var viewModel = TripDetailViewModel()
    @Environment(\.dismiss) private var dismiss
    @State private var showCancelConfirm = false

    var body: some View {
        ScrollView {
            if viewModel.isLoading {
                ProgressView().frame(maxWidth: .infinity, minHeight: 300)
            } else if let trip = viewModel.trip {
                VStack(spacing: 16) {
                    // Trip Info Card
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Trip Info").font(Theme.headlineFont).foregroundColor(Theme.gray900)
                            Spacer()
                            StatusBadge(tripStatus: trip.status)
                        }

                        Divider()

                        // Pickup
                        HStack(spacing: 8) {
                            Image(systemName: "mappin.circle.fill").foregroundColor(Theme.green).font(.system(size: 14))
                            Text(trip.displayPickup)
                                .font(Theme.captionFont).foregroundColor(Theme.gray600)
                        }

                        // Dropoff
                        HStack(spacing: 8) {
                            Image(systemName: "mappin.circle.fill").foregroundColor(Theme.red).font(.system(size: 14))
                            Text(trip.displayDropoff)
                                .font(Theme.captionFont).foregroundColor(Theme.gray600)
                        }

                        // Driver & Vehicle
                        if let driver = trip.driver {
                            Divider()
                            Label("Driver: \(driver.fullName)", systemImage: "person.fill")
                                .font(Theme.captionFont).foregroundColor(Theme.gray700)
                        }
                        if let vehicle = trip.vehicle {
                            Label("Vehicle: \(vehicle.displayName)", systemImage: "car.fill")
                                .font(Theme.captionFont).foregroundColor(Theme.gray700)
                        }
                    }
                    .padding()
                    .cardStyle()

                    // Actions
                    if trip.status != .completed && trip.status != .cancelled {
                        HStack(spacing: 12) {
                            if trip.driver == nil {
                                Button {
                                    viewModel.selectedDriverId = ""
                                    viewModel.selectedVehicleId = ""
                                    viewModel.showAssignSheet = true
                                } label: {
                                    Label("Assign", systemImage: "person.badge.plus")
                                        .font(Theme.captionFont).fontWeight(.semibold)
                                        .foregroundColor(.white)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                        .background(Theme.primary)
                                        .cornerRadius(8)
                                }
                            }

                            Button {
                                showCancelConfirm = true
                            } label: {
                                Label("Cancel Trip", systemImage: "xmark.circle")
                                    .font(Theme.captionFont).fontWeight(.semibold)
                                    .foregroundColor(Theme.red)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 10)
                                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.red, lineWidth: 1))
                            }
                        }
                    }

                    // Timeline
                    if !viewModel.events.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Timeline").font(Theme.headlineFont).foregroundColor(Theme.gray900)
                            ForEach(viewModel.events) { event in
                                TimelineRow(event: event)
                            }
                        }
                    }
                }
                .padding()
                .padding(.bottom, 80)
            }
        }
        .background(Theme.gray50.ignoresSafeArea())
        .navigationTitle("Trip Detail")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.loadTrip(id: tripId) }
        .sheet(isPresented: $viewModel.showAssignSheet) {
            AssignTripSheet(viewModel: viewModel, tripId: tripId)
        }
        .alert("Cancel Trip", isPresented: $showCancelConfirm) {
            Button("Keep", role: .cancel) {}
            Button("Cancel Trip", role: .destructive) {
                Task { await viewModel.cancelTrip(tripId: tripId); dismiss() }
            }
        } message: {
            Text("Are you sure you want to cancel this trip?")
        }
        .overlay {
            if let success = viewModel.actionSuccess {
                SuccessToast(message: success)
                    .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 2) { viewModel.actionSuccess = nil } }
            }
        }
    }
}

struct TimelineRow: View {
    let event: TripEvent

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Circle()
                .fill(Theme.primary.opacity(0.1))
                .frame(width: 32, height: 32)
                .overlay(
                    Image(systemName: iconForType(event.type))
                        .font(.system(size: 14))
                        .foregroundColor(Theme.primary)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text((event.type ?? "").replacingOccurrences(of: "_", with: " ").capitalized)
                    .font(Theme.captionFont).fontWeight(.medium).foregroundColor(Theme.gray900)
                if let details = event.details, !details.isEmpty {
                    Text(details).font(.system(size: 12)).foregroundColor(Theme.gray500)
                }
                if let actor = event.actor, let name = actor.name {
                    Text("by \(name)").font(.system(size: 11)).foregroundColor(Theme.gray400)
                }
                if let time = event.createdAt {
                    Text(String(time.prefix(16)).replacingOccurrences(of: "T", with: " "))
                        .font(.system(size: 10)).foregroundColor(Theme.gray400)
                }
            }
            Spacer()
        }
        .padding(10)
        .cardStyle()
    }

    func iconForType(_ type: String?) -> String {
        guard let type = type?.lowercased() else { return "info.circle" }
        if type.contains("created") { return "plus.circle" }
        if type.contains("assigned") { return "person.badge.plus" }
        if type.contains("departed") { return "car.fill" }
        if type.contains("arrived") { return "mappin.circle.fill" }
        if type.contains("completed") { return "checkmark.circle.fill" }
        if type.contains("cancelled") { return "xmark.circle.fill" }
        return "info.circle"
    }
}

struct AssignTripSheet: View {
    @ObservedObject var viewModel: TripDetailViewModel
    let tripId: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Assign To") {
                    Picker("Driver", selection: $viewModel.selectedDriverId) {
                        Text("Select Driver").tag("")
                        ForEach(viewModel.drivers) { driver in
                            Text(driver.fullName).tag(driver.id)
                        }
                    }
                    Picker("Vehicle", selection: $viewModel.selectedVehicleId) {
                        Text("Select Vehicle").tag("")
                        ForEach(viewModel.vehicles) { vehicle in
                            Text(vehicle.displayName).tag(vehicle.id)
                        }
                    }
                }

                Section {
                    Button {
                        Task { await viewModel.assignTrip(tripId: tripId) }
                    } label: {
                        HStack { Spacer(); Text("Assign Trip").fontWeight(.semibold); Spacer() }
                    }
                    .listRowBackground(Theme.primary)
                    .foregroundColor(.white)
                    .disabled(viewModel.selectedDriverId.isEmpty || viewModel.selectedVehicleId.isEmpty)
                }
            }
            .navigationTitle("Assign Trip")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
        }
    }
}

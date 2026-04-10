import SwiftUI

struct FleetView: View {
    @StateObject private var viewModel = FleetViewModel()

    let columns = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Stats
                    HStack(spacing: 12) {
                        FleetStatCard(value: "\(viewModel.totalCount)", label: "Total", color: Theme.gray600)
                        FleetStatCard(value: "\(viewModel.availableCount)", label: "Available", color: Theme.green)
                        FleetStatCard(value: "\(viewModel.inUseCount)", label: "In Use", color: Theme.primary)
                        FleetStatCard(value: "\(viewModel.maintenanceCount)", label: "Maint.", color: .orange)
                    }
                    .padding(.horizontal)

                    if viewModel.isLoading && viewModel.vehicles.isEmpty {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 200)
                    } else if viewModel.vehicles.isEmpty {
                        EmptyStateView(icon: "car", title: "No Vehicles", subtitle: "Add vehicles to your fleet")
                    } else {
                        LazyVGrid(columns: columns, spacing: 12) {
                            ForEach(viewModel.vehicles) { vehicle in
                                VehicleCard(
                                    vehicle: vehicle,
                                    onStatusChange: { newStatus in
                                        Task { await viewModel.updateStatus(vehicle: vehicle, newStatus: newStatus) }
                                    },
                                    onDelete: { viewModel.confirmDelete(vehicle: vehicle) }
                                )
                            }
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical)
                .padding(.bottom, 80)
            }
            .background(Theme.gray50.ignoresSafeArea())
            .navigationTitle("Fleet")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        viewModel.resetForm()
                        viewModel.showAddSheet = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .refreshable { await viewModel.loadVehicles() }
            .task { await viewModel.loadVehicles() }
            .sheet(isPresented: $viewModel.showAddSheet) {
                AddVehicleSheet(viewModel: viewModel)
            }
            .alert("Delete Vehicle", isPresented: $viewModel.showDeleteConfirm) {
                Button("Cancel", role: .cancel) {}
                Button("Delete", role: .destructive) {
                    Task { await viewModel.deleteVehicle() }
                }
            } message: {
                Text("Delete \(viewModel.vehicleToDelete?.name ?? "this vehicle")?")
            }
            .overlay {
                if let success = viewModel.actionSuccess {
                    SuccessToast(message: success)
                        .onAppear {
                            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                                viewModel.actionSuccess = nil
                            }
                        }
                }
            }
        }
    }
}

struct FleetStatCard: View {
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            Text(label)
                .font(.system(size: 11))
                .foregroundColor(Theme.gray500)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .cardStyle()
    }
}

struct VehicleCard: View {
    let vehicle: Vehicle
    var onStatusChange: (String) -> Void
    var onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "car.fill")
                    .foregroundColor(Theme.gray400)
                Spacer()
                if let status = vehicle.status {
                    StatusBadge(vehicleStatus: status)
                }
            }

            Text(vehicle.name ?? "Unknown")
                .font(Theme.subheadlineFont)
                .fontWeight(.semibold)
                .foregroundColor(Theme.gray900)
                .lineLimit(1)

            Text("\(vehicle.licensePlate ?? vehicle.plateNumber ?? "") • \(vehicle.capacity ?? 4) seats")
                .font(.system(size: 11))
                .foregroundColor(Theme.gray500)
                .lineLimit(1)

            Divider()

            HStack(spacing: 6) {
                if vehicle.status != .available {
                    Button("Available") { onStatusChange("available") }
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Theme.green)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.green, lineWidth: 1))
                }
                if vehicle.status != .maintenance {
                    Button("Maint.") { onStatusChange("maintenance") }
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.orange)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .overlay(RoundedRectangle(cornerRadius: 4).stroke(.orange, lineWidth: 1))
                }
                Spacer()
                Button { onDelete() } label: {
                    Image(systemName: "trash")
                        .font(.system(size: 12))
                        .foregroundColor(Theme.red)
                }
            }
        }
        .padding(12)
        .cardStyle()
    }
}

struct AddVehicleSheet: View {
    @ObservedObject var viewModel: FleetViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Vehicle Details") {
                    TextField("Name", text: $viewModel.formName)
                    TextField("Plate Number", text: $viewModel.formPlateNumber)
                    Picker("Type", selection: $viewModel.formType) {
                        Text("Sedan").tag("sedan")
                        Text("SUV").tag("suv")
                        Text("Van").tag("van")
                        Text("Minibus").tag("minibus")
                        Text("Shuttle").tag("shuttle")
                    }
                    TextField("Capacity", text: $viewModel.formCapacity)
                        .keyboardType(.numberPad)
                }

                Section {
                    Button {
                        Task { await viewModel.createVehicle() }
                    } label: {
                        HStack {
                            Spacer()
                            Text("Add Vehicle").fontWeight(.semibold)
                            Spacer()
                        }
                    }
                    .listRowBackground(Theme.primary)
                    .foregroundColor(.white)
                    .disabled(viewModel.formName.isEmpty || viewModel.formPlateNumber.isEmpty)
                }
            }
            .navigationTitle("Add Vehicle")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

import SwiftUI

struct PermanentAllocationsView: View {
    @StateObject private var viewModel = PermanentAllocationsViewModel()
    @State private var selectedSegment = 0

    let segments = ["All", "Active", "Draft", "Paused"]

    var filteredTrips: [PermanentTrip] {
        switch selectedSegment {
        case 1: return viewModel.trips.filter { $0.status == "active" || $0.status == "in_use" }
        case 2: return viewModel.trips.filter { $0.status == "draft" }
        case 3: return viewModel.trips.filter { $0.status == "paused" }
        default: return viewModel.trips
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Stats
                HStack(spacing: 10) {
                    AllocStatCard(value: "\(viewModel.activeCount)", label: "Active", color: Theme.green)
                    AllocStatCard(value: "\(viewModel.draftCount)", label: "Drafts", color: Theme.primary)
                    AllocStatCard(value: "\(viewModel.pausedCount)", label: "Paused", color: .orange)
                }
                .padding(.horizontal)
                .padding(.top, 8)

                Picker("Filter", selection: $selectedSegment) {
                    ForEach(0..<segments.count, id: \.self) { Text(segments[$0]).tag($0) }
                }
                .pickerStyle(.segmented)
                .padding()

                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(filteredTrips) { trip in
                            PermanentTripCard(trip: trip,
                                onActivate: { Task { await viewModel.activate(trip: trip) } },
                                onPause: { Task { await viewModel.pause(trip: trip) } },
                                onDelete: { Task { await viewModel.delete(trip: trip) } },
                                onSwapDriver: { viewModel.beginSwapDriver(trip: trip) },
                                onSwapVehicle: { viewModel.beginSwapVehicle(trip: trip) }
                            )
                        }
                        if filteredTrips.isEmpty {
                            EmptyStateView(icon: "repeat", title: "No Allocations", subtitle: "Create a permanent allocation")
                        }
                    }
                    .padding()
                    .padding(.bottom, 80)
                }
                .refreshable { await viewModel.loadData() }
            }
            .background(Theme.gray50.ignoresSafeArea())
            .navigationTitle("Allocations")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button { viewModel.resetForm(); viewModel.showCreateSheet = true } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .task { await viewModel.loadData() }
            .sheet(isPresented: $viewModel.showCreateSheet) { CreateAllocationSheet(viewModel: viewModel) }
            .sheet(isPresented: $viewModel.showSwapDriver) { SwapSheet(title: "Swap Driver", items: viewModel.drivers.map { ($0.id, $0.fullName) }, selectedId: $viewModel.swapSelectedId, reason: $viewModel.swapReason, onSwap: { Task { await viewModel.swapDriver() } }) }
            .sheet(isPresented: $viewModel.showSwapVehicle) { SwapSheet(title: "Swap Vehicle", items: viewModel.vehicles.map { ($0.id, $0.displayName) }, selectedId: $viewModel.swapSelectedId, reason: $viewModel.swapReason, onSwap: { Task { await viewModel.swapVehicle() } }) }
            .overlay {
                if let success = viewModel.actionSuccess {
                    SuccessToast(message: success).onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 2) { viewModel.actionSuccess = nil } }
                }
            }
        }
    }
}

struct AllocStatCard: View {
    let value: String; let label: String; let color: Color
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value).font(.title2).fontWeight(.bold).foregroundColor(color)
            Text(label).font(.system(size: 11)).foregroundColor(Theme.gray500)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10).cardStyle()
    }
}

struct PermanentTripCard: View {
    let trip: PermanentTrip
    var onActivate: () -> Void; var onPause: () -> Void
    var onDelete: () -> Void; var onSwapDriver: () -> Void; var onSwapVehicle: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(trip.title ?? "Untitled").font(Theme.subheadlineFont).fontWeight(.semibold).foregroundColor(Theme.gray900)
                Spacer()
                StatusBadge(trip.status?.capitalized ?? "Draft", color: colorForStatus(trip.status))
            }

            HStack(spacing: 4) {
                Image(systemName: "mappin.circle.fill").foregroundColor(Theme.green).font(.system(size: 12))
                Text(trip.pickupLocation ?? "N/A").font(.system(size: 12)).foregroundColor(Theme.gray600)
            }
            HStack(spacing: 4) {
                Image(systemName: "mappin.circle.fill").foregroundColor(Theme.red).font(.system(size: 12))
                Text(trip.dropoffLocation ?? "N/A").font(.system(size: 12)).foregroundColor(Theme.gray600)
            }

            Text("\(trip.scheduledTime ?? "") • \(trip.activeDays?.joined(separator: ", ") ?? "")")
                .font(.system(size: 11)).foregroundColor(Theme.gray400)

            if let driver = trip.driver { Label("Driver: \(driver.name ?? "")", systemImage: "person.fill").font(.system(size: 11)).foregroundColor(Theme.gray500) }
            if let vehicle = trip.vehicle { Label("Vehicle: \(vehicle.name ?? "")", systemImage: "car.fill").font(.system(size: 11)).foregroundColor(Theme.gray500) }

            Divider()

            HStack(spacing: 6) {
                if trip.status == "draft" || trip.status == "paused" {
                    SmallActionBtn("Activate", Theme.green, onActivate)
                }
                if trip.status == "active" || trip.status == "in_use" {
                    SmallActionBtn("Pause", .orange, onPause)
                }
                SmallActionBtn("Swap Driver", Theme.primary, onSwapDriver)
                SmallActionBtn("Swap Vehicle", Theme.primary, onSwapVehicle)
                Spacer()
                Button { onDelete() } label: { Image(systemName: "trash").font(.system(size: 12)).foregroundColor(Theme.red) }
            }
        }
        .padding(12).cardStyle()
    }

    func colorForStatus(_ status: String?) -> Color {
        switch status { case "active", "in_use": return Theme.green; case "paused": return .orange; default: return Theme.primary }
    }
}

struct SmallActionBtn: View {
    let label: String; let color: Color; let action: () -> Void
    init(_ label: String, _ color: Color, _ action: @escaping () -> Void) { self.label = label; self.color = color; self.action = action }
    var body: some View {
        Button(action: action) {
            Text(label).font(.system(size: 10, weight: .medium)).foregroundColor(color)
                .padding(.horizontal, 6).padding(.vertical, 3)
                .overlay(RoundedRectangle(cornerRadius: 4).stroke(color, lineWidth: 1))
        }
    }
}

struct CreateAllocationSheet: View {
    @ObservedObject var viewModel: PermanentAllocationsViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Details") {
                    TextField("Title", text: $viewModel.formTitle)
                    TextField("Pickup Location", text: $viewModel.formPickup)
                    TextField("Dropoff Location", text: $viewModel.formDropoff)
                    TextField("Time (e.g. 8:00 AM)", text: $viewModel.formTime)
                    TextField("Start Date (YYYY-MM-DD)", text: $viewModel.formStartDate)
                    TextField("End Date (YYYY-MM-DD)", text: $viewModel.formEndDate)
                }
                Section {
                    Button { Task { await viewModel.createTrip() } } label: {
                        HStack { Spacer(); Text("Create").fontWeight(.semibold); Spacer() }
                    }
                    .listRowBackground(Theme.primary).foregroundColor(.white)
                    .disabled(viewModel.formTitle.isEmpty || viewModel.formPickup.isEmpty)
                }
            }
            .navigationTitle("New Allocation").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }
    }
}

struct SwapSheet: View {
    let title: String; let items: [(String, String)]
    @Binding var selectedId: String; @Binding var reason: String
    let onSwap: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Select") {
                    Picker("Choose", selection: $selectedId) {
                        Text("None").tag("")
                        ForEach(items, id: \.0) { Text($0.1).tag($0.0) }
                    }
                    TextField("Reason (optional)", text: $reason)
                }
                Section {
                    Button { onSwap() } label: {
                        HStack { Spacer(); Text("Swap").fontWeight(.semibold); Spacer() }
                    }
                    .listRowBackground(Theme.primary).foregroundColor(.white)
                }
            }
            .navigationTitle(title).navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }
    }
}

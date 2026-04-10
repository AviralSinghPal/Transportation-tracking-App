import SwiftUI

struct RideRequestsView: View {
    @StateObject private var viewModel = RideRequestsViewModel()
    @State private var selectedSegment = 0
    @State private var showAddStopSheet = false
    @State private var showAddPassengerSheet = false
    @State private var selectedRideId: String? = nil

    let segments = ["Pending", "Approved", "Assigned", "History"]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Segment Picker
                Picker("Filter", selection: $selectedSegment) {
                    ForEach(0..<segments.count, id: \.self) { index in
                        Text(segments[index]).tag(index)
                    }
                }
                .pickerStyle(.segmented)
                .padding()

                // Content
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(filteredRequests) { request in
                            RideRequestCard(
                                request: request,
                                showActions: selectedSegment <= 1,
                                onApprove: {
                                    Task { await viewModel.approve(request: request) }
                                },
                                onAssign: {
                                    viewModel.beginAssign(request: request)
                                },
                                onReject: {
                                    viewModel.beginReject(request: request)
                                },
                                onAddStop: {
                                    selectedRideId = request.id
                                    showAddStopSheet = true
                                },
                                onAddPassenger: {
                                    selectedRideId = request.id
                                    showAddPassengerSheet = true
                                }
                            )
                        }

                        if filteredRequests.isEmpty {
                            EmptyStateView(
                                icon: "doc.text",
                                title: "No \(segments[selectedSegment]) Requests",
                                subtitle: "Ride requests will appear here"
                            )
                        }
                    }
                    .padding()
                    .padding(.bottom, 80)
                }
                .refreshable {
                    await viewModel.loadAll()
                }
            }
            .background(Theme.gray50.ignoresSafeArea())
            .navigationTitle("Ride Requests")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await viewModel.loadAll()
            }
            .sheet(isPresented: $viewModel.showAssignSheet) {
                AssignSheet(viewModel: viewModel)
            }
            .alert("Reject Ride Request", isPresented: $viewModel.showRejectAlert) {
                TextField("Reason (optional)", text: $viewModel.rejectionReason)
                Button("Cancel", role: .cancel) {
                    viewModel.showRejectAlert = false
                    viewModel.requestToReject = nil
                }
                Button("Reject", role: .destructive) {
                    Task { await viewModel.reject() }
                }
            } message: {
                Text("Reject ride from \(viewModel.requestToReject?.displayPassenger?.fullName ?? "this passenger")?")
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
            .sheet(isPresented: $showAddStopSheet) {
                if let rideId = selectedRideId {
                    AddStopSheet(rideId: rideId, onAdded: {
                        showAddStopSheet = false
                        Task { await viewModel.loadRideRequests() }
                    })
                }
            }
            .sheet(isPresented: $showAddPassengerSheet) {
                if let rideId = selectedRideId {
                    AddPassengerSheet(rideId: rideId, onAdded: {
                        showAddPassengerSheet = false
                        Task { await viewModel.loadRideRequests() }
                    })
                }
            }
        }
    }

    var filteredRequests: [RideRequest] {
        switch selectedSegment {
        case 0: return viewModel.pendingRequests
        case 1: return viewModel.approvedRequests
        case 2: return viewModel.assignedRequests
        case 3: return viewModel.completedRequests
        default: return viewModel.rideRequests
        }
    }
}

struct RideRequestCard: View {
    let request: RideRequest
    let showActions: Bool
    var onApprove: (() -> Void)?
    var onAssign: (() -> Void)?
    var onReject: (() -> Void)?
    var onAddStop: (() -> Void)?
    var onAddPassenger: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(request.displayPassenger?.fullName ?? "Unknown Passenger")
                        .font(Theme.subheadlineFont)
                        .foregroundColor(Theme.gray900)
                    if let dept = request.department, !dept.isEmpty {
                        Text(dept)
                            .font(Theme.captionFont)
                            .foregroundColor(Theme.gray500)
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    if let status = request.status {
                        StatusBadge(rideStatus: status)
                    }
                    if let priority = request.priority {
                        StatusBadge(priority: priority)
                    }
                }
            }

            Divider()

            HStack(spacing: 4) {
                Image(systemName: "mappin.circle.fill")
                    .foregroundColor(Theme.green)
                    .font(.system(size: 14))
                Text(request.pickupLocation?.address ?? "N/A")
                    .font(Theme.captionFont)
                    .foregroundColor(Theme.gray600)
                    .lineLimit(1)
            }

            HStack(spacing: 4) {
                Image(systemName: "mappin.circle.fill")
                    .foregroundColor(Theme.red)
                    .font(.system(size: 14))
                Text(request.dropoffLocation?.address ?? "N/A")
                    .font(Theme.captionFont)
                    .foregroundColor(Theme.gray600)
                    .lineLimit(1)
            }

            HStack {
                if let count = request.passengerCount {
                    Label("\(count)", systemImage: "person.2.fill")
                        .font(Theme.captionFont)
                        .foregroundColor(Theme.gray500)
                }
                Spacer()
                if let time = request.pickupTime {
                    Text(formatDate(time))
                        .font(Theme.captionFont)
                        .foregroundColor(Theme.gray500)
                }
            }

            if showActions {
                HStack(spacing: 8) {
                    if request.status == .pending {
                        Button {
                            onReject?()
                        } label: {
                            Text("Reject")
                                .font(Theme.captionFont)
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                                .background(Theme.red)
                                .cornerRadius(6)
                        }

                        Button {
                            onApprove?()
                        } label: {
                            Text("Approve")
                                .font(Theme.captionFont)
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                                .background(Theme.green)
                                .cornerRadius(6)
                        }
                    }

                    if request.status == .pending || request.status == .approved {
                        Button {
                            onAssign?()
                        } label: {
                            Text("Assign")
                                .font(Theme.captionFont)
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                                .background(Theme.primary)
                                .cornerRadius(6)
                        }
                    }
                }
            }

            // Shared ride actions for assigned/in-progress rides
            if request.status == .assigned || request.status == .inProgress {
                HStack(spacing: 8) {
                    Button {
                        onAddStop?()
                    } label: {
                        Label("Add Stop", systemImage: "mappin.and.ellipse")
                            .font(Theme.captionFont)
                            .fontWeight(.semibold)
                            .foregroundColor(Theme.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .overlay(RoundedRectangle(cornerRadius: 6).stroke(Theme.primary, lineWidth: 1))
                    }

                    Button {
                        onAddPassenger?()
                    } label: {
                        Label("Add Passenger", systemImage: "person.badge.plus")
                            .font(Theme.captionFont)
                            .fontWeight(.semibold)
                            .foregroundColor(Theme.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .overlay(RoundedRectangle(cornerRadius: 6).stroke(Theme.primary, lineWidth: 1))
                    }
                }
            }
        }
        .padding()
        .cardStyle()
    }

    func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: dateString) {
            let display = DateFormatter()
            display.dateFormat = "MMM d, h:mm a"
            return display.string(from: date)
        }
        let formatter2 = ISO8601DateFormatter()
        if let date = formatter2.date(from: dateString) {
            let display = DateFormatter()
            display.dateFormat = "MMM d, h:mm a"
            return display.string(from: date)
        }
        return dateString
    }
}

struct AssignSheet: View {
    @ObservedObject var viewModel: RideRequestsViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                if let request = viewModel.selectedRequest {
                    Section("Request") {
                        Text(request.displayPassenger?.fullName ?? "Unknown")
                        Text(request.pickupLocation?.address ?? "N/A")
                        Text(request.dropoffLocation?.address ?? "N/A")
                    }
                }

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

                    TextField("ETA (optional)", text: $viewModel.eta)
                }

                if let error = viewModel.errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(Theme.red)
                            .font(Theme.captionFont)
                    }
                }

                Section {
                    Button {
                        Task { await viewModel.assign() }
                    } label: {
                        HStack {
                            Spacer()
                            Text("Assign Ride")
                                .fontWeight(.semibold)
                            Spacer()
                        }
                    }
                    .listRowBackground(Theme.primary)
                    .foregroundColor(.white)
                    .disabled(viewModel.selectedDriverId.isEmpty || viewModel.selectedVehicleId.isEmpty)
                }
            }
            .navigationTitle("Assign Ride")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

struct AddStopSheet: View {
    let rideId: String
    let onAdded: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var address: String = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text("Add a Stop")
                    .font(Theme.headlineFont)
                    .foregroundColor(Theme.gray900)

                TextField("Stop address", text: $address)
                    .textFieldStyle(.roundedBorder)
                    .padding(.horizontal)

                if let error = errorMessage {
                    Text(error)
                        .font(Theme.captionFont)
                        .foregroundColor(Theme.red)
                }

                Button {
                    submitStop()
                } label: {
                    if isSubmitting {
                        ProgressView().frame(maxWidth: .infinity)
                    } else {
                        Text("Add Stop")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(address.isEmpty || isSubmitting)
                .padding(.horizontal)

                Spacer()
            }
            .padding(.top, 24)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func submitStop() {
        isSubmitting = true
        errorMessage = nil
        Task {
            do {
                let body: [String: Any] = ["address": address]
                _ = try await APIService.shared.addRideStop(id: rideId, body: body)
                onAdded()
            } catch {
                errorMessage = error.localizedDescription
                isSubmitting = false
            }
        }
    }
}

struct AddPassengerSheet: View {
    let rideId: String
    let onAdded: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var name: String = ""
    @State private var phone: String = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text("Add a Passenger")
                    .font(Theme.headlineFont)
                    .foregroundColor(Theme.gray900)

                TextField("Passenger name", text: $name)
                    .textFieldStyle(.roundedBorder)
                    .padding(.horizontal)

                TextField("Phone number", text: $phone)
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.phonePad)
                    .padding(.horizontal)

                if let error = errorMessage {
                    Text(error)
                        .font(Theme.captionFont)
                        .foregroundColor(Theme.red)
                }

                Button {
                    submitPassenger()
                } label: {
                    if isSubmitting {
                        ProgressView().frame(maxWidth: .infinity)
                    } else {
                        Text("Add Passenger")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(name.isEmpty || isSubmitting)
                .padding(.horizontal)

                Spacer()
            }
            .padding(.top, 24)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func submitPassenger() {
        isSubmitting = true
        errorMessage = nil
        Task {
            do {
                let body: [String: Any] = ["name": name, "phone": phone]
                _ = try await APIService.shared.addRidePassenger(id: rideId, body: body)
                onAdded()
            } catch {
                errorMessage = error.localizedDescription
                isSubmitting = false
            }
        }
    }
}

struct EmptyStateView: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundColor(Theme.gray300)
            Text(title)
                .font(Theme.headlineFont)
                .foregroundColor(Theme.gray500)
            Text(subtitle)
                .font(Theme.captionFont)
                .foregroundColor(Theme.gray400)
        }
        .frame(maxWidth: .infinity)
        .padding(40)
    }
}

struct SuccessToast: View {
    let message: String

    var body: some View {
        VStack {
            HStack(spacing: 8) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(Theme.green)
                Text(message)
                    .font(Theme.subheadlineFont)
                    .foregroundColor(.white)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Theme.gray800)
            .cornerRadius(Theme.cornerRadiusSmall)
            .shadow(color: Theme.shadowColor, radius: 8, x: 0, y: 4)
            .padding(.top, 8)

            Spacer()
        }
        .transition(.move(edge: .top).combined(with: .opacity))
        .animation(.spring(), value: true)
    }
}

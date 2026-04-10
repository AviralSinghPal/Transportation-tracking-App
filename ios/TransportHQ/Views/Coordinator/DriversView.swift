import SwiftUI

struct DriversView: View {
    @StateObject private var viewModel = DriversViewModel()

    let columns = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Stats
                    HStack(spacing: 12) {
                        DriverStatCard(value: "\(viewModel.totalCount)", label: "Total", color: Theme.gray600)
                        DriverStatCard(value: "\(viewModel.availableCount)", label: "Available", color: Theme.green)
                        DriverStatCard(value: "\(viewModel.unavailableCount)", label: "Unavailable", color: Theme.red)
                    }
                    .padding(.horizontal)

                    if viewModel.isLoading && viewModel.drivers.isEmpty {
                        ProgressView().frame(maxWidth: .infinity, minHeight: 200)
                    } else if viewModel.drivers.isEmpty {
                        EmptyStateView(icon: "person.2", title: "No Drivers", subtitle: "Add drivers to your fleet")
                    } else {
                        LazyVGrid(columns: columns, spacing: 12) {
                            ForEach(viewModel.drivers) { driver in
                                DriverCard(
                                    driver: driver,
                                    onToggle: { Task { await viewModel.toggleAvailability(driver: driver) } }
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
            .navigationTitle("Drivers")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        viewModel.resetForm()
                        viewModel.showAddSheet = true
                    } label: {
                        Image(systemName: "person.badge.plus")
                    }
                }
            }
            .refreshable { await viewModel.loadDrivers() }
            .task { await viewModel.loadDrivers() }
            .sheet(isPresented: $viewModel.showAddSheet) {
                AddTempDriverSheet(viewModel: viewModel)
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

struct DriverStatCard: View {
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value).font(.title2).fontWeight(.bold).foregroundColor(color)
            Text(label).font(.system(size: 11)).foregroundColor(Theme.gray500)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .cardStyle()
    }
}

struct DriverCard: View {
    let driver: Driver
    var onToggle: () -> Void

    var isAvailable: Bool { driver.isAvailable ?? true }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Circle()
                    .fill(Theme.primary.opacity(0.1))
                    .frame(width: 40, height: 40)
                    .overlay(
                        Text(driver.initials)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(Theme.primary)
                    )
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    if driver.isPermanentlyAllocated == true {
                        StatusBadge("PA", color: Theme.blue)
                    }
                    StatusBadge(isAvailable ? "On Duty" : "Off Duty",
                              color: isAvailable ? Theme.green : Theme.red)
                }
            }

            Text(driver.fullName)
                .font(Theme.subheadlineFont)
                .fontWeight(.semibold)
                .foregroundColor(Theme.gray900)
                .lineLimit(1)

            if let phone = driver.phone {
                Label(phone, systemImage: "phone.fill")
                    .font(.system(size: 11))
                    .foregroundColor(Theme.gray500)
            }

            if let license = driver.licenseNumber, !license.isEmpty {
                Label(license, systemImage: "creditcard.fill")
                    .font(.system(size: 11))
                    .foregroundColor(Theme.gray500)
            }

            if let expiry = driver.licenseExpiry, !expiry.isEmpty {
                Label("Expires \(expiry.prefix(10))", systemImage: "calendar")
                    .font(.system(size: 11))
                    .foregroundColor(Theme.gray500)
            }

            Divider()

            Button {
                onToggle()
            } label: {
                Text(isAvailable ? "Set Unavailable" : "Set Available")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(isAvailable ? Theme.red : Theme.green)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
                    .background((isAvailable ? Theme.red : Theme.green).opacity(0.1))
                    .cornerRadius(6)
            }
        }
        .padding(12)
        .cardStyle()
    }
}

struct AddTempDriverSheet: View {
    @ObservedObject var viewModel: DriversViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Driver Details") {
                    TextField("Name", text: $viewModel.formName)
                    TextField("Phone Number", text: $viewModel.formPhone)
                        .keyboardType(.phonePad)
                    TextField("License Number (optional)", text: $viewModel.formLicense)
                }

                Section {
                    Button {
                        Task { await viewModel.createTempDriver() }
                    } label: {
                        HStack {
                            Spacer()
                            Text("Add Driver").fontWeight(.semibold)
                            Spacer()
                        }
                    }
                    .listRowBackground(Theme.primary)
                    .foregroundColor(.white)
                    .disabled(viewModel.formName.isEmpty || viewModel.formPhone.isEmpty)
                }
            }
            .navigationTitle("Add Temp Driver")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

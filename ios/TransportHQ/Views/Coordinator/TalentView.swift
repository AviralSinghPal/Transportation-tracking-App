import SwiftUI

@MainActor
final class TalentViewModel: ObservableObject {
    @Published var profiles: [TalentProfileData] = []
    @Published var isLoading = false
    @Published var actionSuccess: String?
    @Published var showAddSheet = false
    @Published var formName = ""
    @Published var formPhone = ""
    @Published var formEmail = ""

    func loadData() async {
        isLoading = true
        do { profiles = try await APIService.shared.getTalentProfiles() }
        catch { print("Talent error: \(error)") }
        isLoading = false
    }

    func markTraveling(id: String) async {
        do { _ = try await APIService.shared.markTalentTraveling(id: id); actionSuccess = "Marked traveling"; await loadData() }
        catch { print("Error: \(error)") }
    }

    func markArrived(id: String) async {
        do { _ = try await APIService.shared.markTalentArrived(id: id); actionSuccess = "Marked arrived"; await loadData() }
        catch { print("Error: \(error)") }
    }

    func deleteTalent(id: String) async {
        do { try await APIService.shared.deleteTalentProfile(id: id); actionSuccess = "Deleted"; await loadData() }
        catch { print("Error: \(error)") }
    }

    func createTalent() async {
        guard !formName.isEmpty else { return }
        do {
            _ = try await APIService.shared.createTalentProfile(body: ["name": formName, "phone": formPhone, "email": formEmail])
            showAddSheet = false; formName = ""; formPhone = ""; formEmail = ""
            actionSuccess = "Profile created"
            await loadData()
        } catch { print("Error: \(error)") }
    }
}

struct TalentView: View {
    @StateObject private var viewModel = TalentViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 12) {
                    if viewModel.isLoading && viewModel.profiles.isEmpty {
                        ProgressView().frame(maxWidth: .infinity, minHeight: 200)
                    } else if viewModel.profiles.isEmpty {
                        EmptyStateView(icon: "star", title: "No Talent Profiles", subtitle: "Add talent to manage their transportation")
                    } else {
                        ForEach(viewModel.profiles) { talent in
                            TalentCard(talent: talent,
                                onTraveling: { Task { await viewModel.markTraveling(id: talent.id) } },
                                onArrived: { Task { await viewModel.markArrived(id: talent.id) } },
                                onDelete: { Task { await viewModel.deleteTalent(id: talent.id) } }
                            )
                        }
                    }
                }
                .padding()
                .padding(.bottom, 80)
            }
            .background(Theme.gray50.ignoresSafeArea())
            .navigationTitle("Talent Profiles").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button { viewModel.formName = ""; viewModel.formPhone = ""; viewModel.formEmail = ""; viewModel.showAddSheet = true } label: { Image(systemName: "person.badge.plus") }
                }
            }
            .task { await viewModel.loadData() }
            .refreshable { await viewModel.loadData() }
            .sheet(isPresented: $viewModel.showAddSheet) {
                NavigationStack {
                    Form {
                        Section("Details") {
                            TextField("Name", text: $viewModel.formName)
                            TextField("Phone", text: $viewModel.formPhone).keyboardType(.phonePad)
                            TextField("Email", text: $viewModel.formEmail).keyboardType(.emailAddress)
                        }
                        Section {
                            Button { Task { await viewModel.createTalent() } } label: {
                                HStack { Spacer(); Text("Add Talent").fontWeight(.semibold); Spacer() }
                            }
                            .listRowBackground(Theme.primary).foregroundColor(.white).disabled(viewModel.formName.isEmpty)
                        }
                    }
                    .navigationTitle("Add Talent").navigationBarTitleDisplayMode(.inline)
                    .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { viewModel.showAddSheet = false } } }
                }
            }
            .overlay {
                if let success = viewModel.actionSuccess {
                    SuccessToast(message: success).onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 2) { viewModel.actionSuccess = nil } }
                }
            }
        }
    }
}

struct TalentCard: View {
    let talent: TalentProfileData
    var onTraveling: () -> Void
    var onArrived: () -> Void
    var onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Circle()
                    .fill(Theme.primary.opacity(0.1))
                    .frame(width: 44, height: 44)
                    .overlay(Text(talent.initials).font(.system(size: 18, weight: .bold)).foregroundColor(Theme.primary))

                VStack(alignment: .leading, spacing: 2) {
                    Text(talent.name ?? "Unknown").font(Theme.subheadlineFont).fontWeight(.semibold).foregroundColor(Theme.gray900)
                    HStack(spacing: 6) {
                        Text(talent.phone ?? "").font(.system(size: 11)).foregroundColor(Theme.gray500)
                        if talent.isConfidential == true {
                            StatusBadge("Confidential", color: .orange)
                        }
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    StatusBadge((talent.status ?? "at-hotel").replacingOccurrences(of: "-", with: " ").uppercased(),
                              color: talent.status == "traveling" ? Theme.primary : Theme.green)
                    Button { onDelete() } label: { Image(systemName: "trash").font(.system(size: 12)).foregroundColor(Theme.red) }
                }
            }

            // Preferences
            if !talent.preferences.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(talent.preferences, id: \.1) { icon, pref in
                            HStack(spacing: 3) {
                                Image(systemName: icon).font(.system(size: 10)).foregroundColor(Theme.gray500)
                                Text(pref).font(.system(size: 11)).foregroundColor(Theme.gray600)
                            }
                            .padding(.horizontal, 8).padding(.vertical, 3)
                            .background(Theme.gray100).cornerRadius(12)
                        }
                    }
                }
            }

            // Hotel & Agent
            if let hotel = talent.hotelName, !hotel.isEmpty {
                Label("Hotel: \(hotel)\(talent.hotelAddress.map { ", \($0)" } ?? "")", systemImage: "building.2.fill")
                    .font(.system(size: 11)).foregroundColor(Theme.gray500)
            }
            if let agent = talent.agentName, !agent.isEmpty {
                Label("Agent: \(agent)\(talent.agentPhone.map { " (\($0))" } ?? "")", systemImage: "phone.fill")
                    .font(.system(size: 11)).foregroundColor(Theme.gray500)
            }
            if let driver = talent.preferredDriver, let name = driver.name {
                Label("Preferred Driver: \(name)", systemImage: "person.fill")
                    .font(.system(size: 11)).foregroundColor(Theme.gray500)
            }

            Text("\(talent.totalTrips ?? 0) trips • $\(String(format: "%.0f", talent.totalCost ?? 0)) total cost • \(String(format: "%.0f", talent.totalMiles ?? 0)) miles")
                .font(.system(size: 11)).foregroundColor(Theme.gray400)

            Divider()

            HStack(spacing: 8) {
                Button { onTraveling() } label: {
                    Label("Talent Traveling", systemImage: "airplane.departure")
                        .font(.system(size: 11, weight: .medium)).foregroundColor(.white)
                        .padding(.horizontal, 10).padding(.vertical, 6).background(Theme.primary).cornerRadius(6)
                }
                Button { onArrived() } label: {
                    Label("Talent Arrived", systemImage: "checkmark.circle.fill")
                        .font(.system(size: 11, weight: .medium)).foregroundColor(.white)
                        .padding(.horizontal, 10).padding(.vertical, 6).background(Theme.green).cornerRadius(6)
                }
            }
        }
        .padding(12).cardStyle()
    }
}

import SwiftUI

@MainActor
final class ShuttlesViewModel: ObservableObject {
    @Published var routes: [ShuttleRouteData] = []
    @Published var schedule: [ShuttleRunData] = []
    @Published var isLoading = false
    @Published var actionSuccess: String?

    func loadData() async {
        isLoading = true
        do {
            async let r = APIService.shared.getShuttleRoutes()
            async let s = APIService.shared.getShuttleSchedule()
            routes = try await r
            schedule = try await s
        } catch { print("Shuttles error: \(error)") }
        isLoading = false
    }

    func deleteRoute(id: String) async {
        do { try await APIService.shared.deleteShuttleRoute(id: id); actionSuccess = "Route deleted"; await loadData() }
        catch { print("Delete error: \(error)") }
    }
}

struct ShuttlesView: View {
    @StateObject private var viewModel = ShuttlesViewModel()
    @State private var selectedSegment = 0

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack(spacing: 10) {
                    AllocStatCard(value: "\(viewModel.routes.count)", label: "Routes", color: Theme.primary)
                    AllocStatCard(value: "\(viewModel.routes.filter { $0.isActive == true }.count)", label: "Active", color: Theme.green)
                    AllocStatCard(value: "\(viewModel.schedule.count)", label: "Scheduled", color: .orange)
                }
                .padding(.horizontal).padding(.top, 8)

                Picker("", selection: $selectedSegment) {
                    Text("Routes").tag(0)
                    Text("Today's Schedule (\(viewModel.schedule.count))").tag(1)
                }
                .pickerStyle(.segmented).padding()

                ScrollView {
                    LazyVStack(spacing: 12) {
                        if selectedSegment == 0 {
                            ForEach(viewModel.routes) { route in
                                ShuttleRouteCard(route: route, onDelete: { Task { await viewModel.deleteRoute(id: route.id) } })
                            }
                            if viewModel.routes.isEmpty {
                                EmptyStateView(icon: "bus", title: "No Routes", subtitle: "Create shuttle routes to get started")
                            }
                        } else {
                            ForEach(viewModel.schedule) { run in
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(run.route?.name ?? "Unknown").font(Theme.subheadlineFont).fontWeight(.semibold)
                                        Text("\(run.occupancy ?? 0)/\(run.capacity ?? 20) passengers").font(Theme.captionFont).foregroundColor(Theme.gray500)
                                    }
                                    Spacer()
                                    StatusBadge((run.status ?? "scheduled").capitalized, color: run.status == "completed" ? Theme.green : Theme.primary)
                                }
                                .padding(12).cardStyle()
                            }
                            if viewModel.schedule.isEmpty {
                                EmptyStateView(icon: "calendar", title: "No Runs Today", subtitle: "Generate runs from routes")
                            }
                        }
                    }
                    .padding().padding(.bottom, 80)
                }
                .refreshable { await viewModel.loadData() }
            }
            .background(Theme.gray50.ignoresSafeArea())
            .navigationTitle("Routes").navigationBarTitleDisplayMode(.inline)
            .task { await viewModel.loadData() }
            .overlay {
                if let success = viewModel.actionSuccess {
                    SuccessToast(message: success).onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 2) { viewModel.actionSuccess = nil } }
                }
            }
        }
    }
}

struct ShuttleRouteCard: View {
    let route: ShuttleRouteData
    var onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(route.name ?? "Untitled").font(Theme.subheadlineFont).fontWeight(.semibold).foregroundColor(Theme.gray900)
                Spacer()
                StatusBadge(route.isActive == true ? "Active" : "Inactive", color: route.isActive == true ? Theme.green : Theme.gray400)
            }
            Text("Every \(route.frequency ?? 30) min • \(route.startTime ?? "") – \(route.endTime ?? "") • \(route.capacity ?? 20) seats")
                .font(.system(size: 12)).foregroundColor(Theme.gray500)

            if let stops = route.stops, !stops.isEmpty {
                ForEach(Array(stops.enumerated()), id: \.offset) { idx, stop in
                    HStack(spacing: 6) {
                        Circle()
                            .fill(idx == 0 ? Theme.green : idx == stops.count - 1 ? Theme.red : Theme.primary)
                            .frame(width: 18, height: 18)
                            .overlay(Text("\(idx + 1)").font(.system(size: 9, weight: .bold)).foregroundColor(.white))
                        Text("\(stop.name ?? "") \(stop.estimatedTime ?? "")").font(.system(size: 12)).foregroundColor(Theme.gray600)
                    }
                }
            }

            if let days = route.daysActive {
                Text(days.joined(separator: ", ")).font(.system(size: 11)).foregroundColor(Theme.gray400)
            }

            Divider()
            HStack {
                Spacer()
                Button { onDelete() } label: { Image(systemName: "trash").font(.system(size: 12)).foregroundColor(Theme.red) }
            }
        }
        .padding(12).cardStyle()
    }
}

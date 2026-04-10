import SwiftUI

@MainActor
final class MaintenanceViewModel: ObservableObject {
    @Published var records: [MaintenanceRecordData] = []
    @Published var alerts: [MaintenanceRecordData] = []
    @Published var isLoading = false
    @Published var actionSuccess: String?

    func loadData() async {
        isLoading = true
        do {
            async let r = APIService.shared.getMaintenance()
            async let a = APIService.shared.getMaintenanceAlerts()
            records = try await r
            alerts = try await a
        } catch { print("Maintenance error: \(error)") }
        isLoading = false
    }

    func markComplete(record: MaintenanceRecordData) async {
        do {
            _ = try await APIService.shared.updateMaintenance(id: record.id, body: ["status": "completed"])
            actionSuccess = "Marked complete"
            await loadData()
        } catch { print("Error: \(error)") }
    }
}

struct MaintenanceView: View {
    @StateObject private var viewModel = MaintenanceViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    if !viewModel.alerts.isEmpty {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill").foregroundColor(.orange)
                            Text("\(viewModel.alerts.count) Upcoming/Overdue").font(Theme.captionFont).fontWeight(.medium).foregroundColor(.orange)
                            Spacer()
                        }
                        .padding(12)
                        .background(.orange.opacity(0.1))
                        .cornerRadius(10)
                    }

                    if viewModel.isLoading {
                        ProgressView().frame(maxWidth: .infinity, minHeight: 200)
                    } else {
                        ForEach(viewModel.records) { record in
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Text(record.title ?? "Untitled").font(Theme.subheadlineFont).fontWeight(.semibold)
                                    Spacer()
                                    StatusBadge((record.status ?? "scheduled").capitalized, color: record.status == "completed" ? Theme.green : .orange)
                                }
                                Text("\(record.vehicle?.name ?? "") • \(record.type ?? "")").font(Theme.captionFont).foregroundColor(Theme.gray500)
                                HStack {
                                    Text(String((record.scheduledDate ?? "").prefix(10))).font(.system(size: 11)).foregroundColor(Theme.gray400)
                                    Text("$\(String(format: "%.0f", record.cost ?? 0))").font(.system(size: 11)).foregroundColor(Theme.gray400)
                                }
                                if record.status != "completed" {
                                    Button { Task { await viewModel.markComplete(record: record) } } label: {
                                        Text("Mark Complete").font(.system(size: 12, weight: .medium)).foregroundColor(.white)
                                            .padding(.horizontal, 12).padding(.vertical, 6).background(Theme.green).cornerRadius(6)
                                    }
                                }
                            }
                            .padding(12).cardStyle()
                        }
                    }
                }
                .padding()
                .padding(.bottom, 80)
            }
            .background(Theme.gray50.ignoresSafeArea())
            .navigationTitle("Maintenance")
            .navigationBarTitleDisplayMode(.inline)
            .task { await viewModel.loadData() }
            .refreshable { await viewModel.loadData() }
            .overlay {
                if let success = viewModel.actionSuccess {
                    SuccessToast(message: success).onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 2) { viewModel.actionSuccess = nil } }
                }
            }
        }
    }
}

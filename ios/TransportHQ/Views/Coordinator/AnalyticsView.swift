import SwiftUI

@MainActor
final class AnalyticsViewModel: ObservableObject {
    @Published var dashboard: AnalyticsDashboard?
    @Published var driverPerformance: [DriverPerformanceEntry] = []
    @Published var isLoading = false

    // Report tab data
    @Published var dailyReport: DailyReportData?
    @Published var timecards: [TimecardEntryData] = []
    @Published var vehicleUtilization: [VehicleUtilizationData] = []
    @Published var costAnalysis: CostAnalysisData?
    @Published var isLoadingReport = false
    @Published var loadedTabs: Set<Int> = []

    func loadData() async {
        isLoading = true
        do {
            async let d = APIService.shared.getAnalyticsDashboard()
            async let p = APIService.shared.getDriverPerformance()
            dashboard = try await d
            driverPerformance = try await p
            loadedTabs.insert(0)
        } catch { print("Analytics error: \(error)") }
        isLoading = false
    }

    func loadReportTab(_ index: Int) async {
        guard !loadedTabs.contains(index) else { return }
        isLoadingReport = true
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let today = formatter.string(from: Date())
        let weekAgo = formatter.string(from: Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date())

        do {
            switch index {
            case 1: // Daily
                dailyReport = try await APIService.shared.getDailyReport(date: today)
            case 2: // Timecards
                timecards = try await APIService.shared.getTimecards(startDate: weekAgo, endDate: today)
            case 3: // Utilization
                vehicleUtilization = try await APIService.shared.getVehicleUtilization(startDate: weekAgo, endDate: today)
            case 5: // Costs
                costAnalysis = try await APIService.shared.getCostAnalysis(startDate: weekAgo, endDate: today)
            default:
                break
            }
            loadedTabs.insert(index)
        } catch {
            print("Report tab \(index) error: \(error)")
        }
        isLoadingReport = false
    }
}

struct AnalyticsView: View {
    @StateObject private var viewModel = AnalyticsViewModel()
    @State private var selectedTab = 0

    let tabs = ["Dashboard", "Daily", "Timecards", "Utilization", "On-Time", "Costs", "Overtime"]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Horizontal scrollable tab bar
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(0..<tabs.count, id: \.self) { index in
                            Button(tabs[index]) {
                                selectedTab = index
                                Task { await viewModel.loadReportTab(index) }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(selectedTab == index ? Theme.primary : Theme.gray100)
                            .foregroundColor(selectedTab == index ? .white : Theme.gray600)
                            .cornerRadius(20)
                            .font(.system(size: 13, weight: .medium))
                        }
                    }
                    .padding(.horizontal, 16)
                }
                .padding(.vertical, 12)

                // Tab content
                ScrollView {
                    VStack(spacing: 16) {
                        switch selectedTab {
                        case 0:
                            dashboardContent
                        case 1:
                            dailyReportContent
                        case 2:
                            timecardsContent
                        case 3:
                            utilizationContent
                        case 4:
                            comingSoonContent(title: "On-Time Report")
                        case 5:
                            costsContent
                        case 6:
                            comingSoonContent(title: "Overtime Report")
                        default:
                            dashboardContent
                        }
                    }
                    .padding()
                    .padding(.bottom, 80)
                }
                .refreshable {
                    viewModel.loadedTabs.remove(selectedTab)
                    if selectedTab == 0 {
                        await viewModel.loadData()
                    } else {
                        await viewModel.loadReportTab(selectedTab)
                    }
                }
            }
            .background(Theme.gray50.ignoresSafeArea())
            .navigationTitle("Insights")
            .navigationBarTitleDisplayMode(.inline)
            .task { await viewModel.loadData() }
        }
    }

    // MARK: - Tab 0: Dashboard

    @ViewBuilder
    var dashboardContent: some View {
        if viewModel.isLoading {
            ProgressView().frame(maxWidth: .infinity, minHeight: 200)
        } else if let dash = viewModel.dashboard {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                AnalyticsKpiCard(value: "\(dash.totalTrips ?? 0)", label: "Total Trips", color: Theme.primary)
                AnalyticsKpiCard(value: "\(String(format: "%.0f", dash.completionRate ?? 0))%", label: "Completion", color: Theme.green)
                AnalyticsKpiCard(value: "$\(String(format: "%.2f", dash.totalCost ?? 0))", label: "Total Cost", color: .orange)
                AnalyticsKpiCard(value: "\(String(format: "%.0f", dash.totalMiles ?? 0))", label: "Total Miles", color: Theme.gray600)
            }

            if !viewModel.driverPerformance.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Driver Performance").font(Theme.headlineFont).foregroundColor(Theme.gray900)
                    ForEach(viewModel.driverPerformance) { driver in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(driver.name ?? "Unknown").font(Theme.subheadlineFont).fontWeight(.semibold)
                                Text("\(driver.totalTrips ?? 0) trips \u{2022} \(String(format: "%.1f", driver.averageRating ?? 0)) \u{2605}")
                                    .font(Theme.captionFont).foregroundColor(Theme.gray500)
                            }
                            Spacer()
                            VStack(alignment: .trailing) {
                                Text("\(driver.completedTrips ?? 0)/\(driver.totalTrips ?? 0)")
                                    .font(Theme.subheadlineFont).fontWeight(.bold).foregroundColor(Theme.green)
                                Text("\(String(format: "%.0f", driver.onTimeRate ?? 0))% on-time")
                                    .font(.system(size: 11)).foregroundColor(Theme.gray400)
                            }
                        }
                        .padding(12).cardStyle()
                    }
                }
            }
        }
    }

    // MARK: - Tab 1: Daily Report

    @ViewBuilder
    var dailyReportContent: some View {
        if viewModel.isLoadingReport {
            ProgressView().frame(maxWidth: .infinity, minHeight: 200)
        } else if let report = viewModel.dailyReport {
            VStack(spacing: 12) {
                ReportKeyValueCard(key: "Date", value: report.date ?? "Today")
                ReportKeyValueCard(key: "Total Trips", value: "\(report.totalTrips ?? 0)")
                ReportKeyValueCard(key: "Completed Trips", value: "\(report.completedTrips ?? 0)")
                ReportKeyValueCard(key: "Total Ride Requests", value: "\(report.totalRideRequests ?? 0)")
                ReportKeyValueCard(key: "Active Drivers", value: "\(report.activeDrivers ?? 0)")
                ReportKeyValueCard(key: "Total Miles", value: String(format: "%.1f", report.totalMiles ?? 0))
                ReportKeyValueCard(key: "Total Cost", value: String(format: "$%.2f", report.totalCost ?? 0))
            }
        } else {
            EmptyStateView(icon: "doc.text", title: "No Daily Report", subtitle: "Pull to refresh")
        }
    }

    // MARK: - Tab 2: Timecards

    @ViewBuilder
    var timecardsContent: some View {
        if viewModel.isLoadingReport {
            ProgressView().frame(maxWidth: .infinity, minHeight: 200)
        } else if viewModel.timecards.isEmpty {
            EmptyStateView(icon: "clock", title: "No Timecards", subtitle: "Pull to refresh")
        } else {
            ForEach(viewModel.timecards) { entry in
                VStack(alignment: .leading, spacing: 8) {
                    Text(entry.driverName ?? "Unknown Driver")
                        .font(Theme.subheadlineFont).fontWeight(.semibold)
                    HStack {
                        Text("Hours: \(String(format: "%.1f", entry.totalHours ?? 0))")
                            .font(Theme.captionFont).foregroundColor(Theme.gray600)
                        Spacer()
                        Text("Trips: \(entry.trips ?? 0)")
                            .font(Theme.captionFont).foregroundColor(Theme.gray600)
                    }
                    if let date = entry.date {
                        Text(date).font(Theme.smallFont).foregroundColor(Theme.gray400)
                    }
                }
                .padding(12).cardStyle()
            }
        }
    }

    // MARK: - Tab 3: Utilization

    @ViewBuilder
    var utilizationContent: some View {
        if viewModel.isLoadingReport {
            ProgressView().frame(maxWidth: .infinity, minHeight: 200)
        } else if viewModel.vehicleUtilization.isEmpty {
            EmptyStateView(icon: "car.fill", title: "No Utilization Data", subtitle: "Pull to refresh")
        } else {
            ForEach(viewModel.vehicleUtilization) { entry in
                VStack(alignment: .leading, spacing: 8) {
                    Text(entry.vehicleName ?? "Unknown Vehicle")
                        .font(Theme.subheadlineFont).fontWeight(.semibold)
                    HStack {
                        Text("Trips: \(entry.totalTrips ?? 0)")
                            .font(Theme.captionFont).foregroundColor(Theme.gray600)
                        Spacer()
                        Text("Miles: \(String(format: "%.1f", entry.totalMiles ?? 0))")
                            .font(Theme.captionFont).foregroundColor(Theme.gray600)
                    }
                    if let rate = entry.utilizationRate {
                        HStack {
                            Text("Utilization")
                                .font(Theme.captionFont).foregroundColor(Theme.gray500)
                            Spacer()
                            Text(String(format: "%.0f%%", rate))
                                .font(Theme.subheadlineFont).fontWeight(.bold).foregroundColor(Theme.primary)
                        }
                    }
                }
                .padding(12).cardStyle()
            }
        }
    }

    // MARK: - Tab 5: Costs

    @ViewBuilder
    var costsContent: some View {
        if viewModel.isLoadingReport {
            ProgressView().frame(maxWidth: .infinity, minHeight: 200)
        } else if let costs = viewModel.costAnalysis {
            VStack(spacing: 12) {
                ReportKeyValueCard(key: "Total Cost", value: String(format: "$%.2f", costs.totalCost ?? 0))
                ReportKeyValueCard(key: "Avg Cost per Trip", value: String(format: "$%.2f", costs.averageCostPerTrip ?? 0))
            }
        } else {
            EmptyStateView(icon: "dollarsign.circle", title: "No Cost Data", subtitle: "Pull to refresh")
        }
    }

    // MARK: - Coming Soon

    @ViewBuilder
    func comingSoonContent(title: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "clock.badge.exclamationmark")
                .font(.system(size: 48))
                .foregroundColor(Theme.gray300)
            Text(title)
                .font(Theme.headlineFont)
                .foregroundColor(Theme.gray500)
            Text("Coming Soon")
                .font(Theme.captionFont)
                .foregroundColor(Theme.gray400)
        }
        .frame(maxWidth: .infinity)
        .padding(40)
    }
}

// MARK: - Supporting Views

struct AnalyticsKpiCard: View {
    let value: String; let label: String; let color: Color
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value).font(.title2).fontWeight(.bold).foregroundColor(color)
            Text(label).font(.system(size: 12)).foregroundColor(Theme.gray500)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14).cardStyle()
    }
}

struct ReportKeyValueCard: View {
    let key: String
    let value: String

    var body: some View {
        HStack {
            Text(key)
                .font(Theme.subheadlineFont)
                .foregroundColor(Theme.gray600)
            Spacer()
            Text(value)
                .font(Theme.subheadlineFont)
                .fontWeight(.semibold)
                .foregroundColor(Theme.gray900)
        }
        .padding(14)
        .cardStyle()
    }
}

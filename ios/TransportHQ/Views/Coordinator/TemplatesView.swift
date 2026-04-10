import SwiftUI

@MainActor
final class TemplatesViewModel: ObservableObject {
    @Published var dayTemplates: [DayTemplateData] = []
    @Published var tripTemplates: [TripTemplateData] = []
    @Published var isLoading = false
    @Published var actionSuccess: String?
    @Published var showCaptureSheet = false
    @Published var captureName = ""

    func loadData() async {
        isLoading = true
        do {
            async let d = APIService.shared.getDayTemplates()
            async let t = APIService.shared.getTripTemplates()
            dayTemplates = try await d
            tripTemplates = try await t
        } catch { print("Templates error: \(error)") }
        isLoading = false
    }

    func captureDay() async {
        guard !captureName.isEmpty else { return }
        do {
            _ = try await APIService.shared.captureDayTemplate(name: captureName)
            showCaptureSheet = false; captureName = ""
            actionSuccess = "Day captured"
            await loadData()
        } catch { print("Capture error: \(error)") }
    }

    func applyDay(id: String) async {
        do { _ = try await APIService.shared.applyDayTemplate(id: id); actionSuccess = "Template applied" }
        catch { print("Apply error: \(error)") }
    }

    func createFromTemplate(id: String) async {
        do { _ = try await APIService.shared.createTripFromTemplate(id: id); actionSuccess = "Trip created" }
        catch { print("Create error: \(error)") }
    }

    func deleteDay(id: String) async {
        do { try await APIService.shared.deleteDayTemplate(id: id); actionSuccess = "Deleted"; await loadData() }
        catch { print("Delete error: \(error)") }
    }

    func deleteTrip(id: String) async {
        do { try await APIService.shared.deleteTripTemplate(id: id); actionSuccess = "Deleted"; await loadData() }
        catch { print("Delete error: \(error)") }
    }
}

struct TemplatesView: View {
    @StateObject private var viewModel = TemplatesViewModel()
    @State private var selectedSegment = 0

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("", selection: $selectedSegment) {
                    Text("Day Schedules (\(viewModel.dayTemplates.count))").tag(0)
                    Text("Trip Templates (\(viewModel.tripTemplates.count))").tag(1)
                }
                .pickerStyle(.segmented).padding()

                ScrollView {
                    LazyVStack(spacing: 10) {
                        if selectedSegment == 0 {
                            ForEach(viewModel.dayTemplates) { tmpl in
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(tmpl.name ?? "Untitled").font(Theme.subheadlineFont).fontWeight(.semibold)
                                        Text("Used \(tmpl.usageCount ?? 0) times").font(Theme.captionFont).foregroundColor(Theme.gray500)
                                    }
                                    Spacer()
                                    Button("Apply") { Task { await viewModel.applyDay(id: tmpl.id) } }
                                        .font(.system(size: 11, weight: .medium)).foregroundColor(Theme.primary)
                                        .padding(.horizontal, 8).padding(.vertical, 4)
                                        .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.primary, lineWidth: 1))
                                    Button { Task { await viewModel.deleteDay(id: tmpl.id) } } label: {
                                        Image(systemName: "trash").font(.system(size: 12)).foregroundColor(Theme.red)
                                    }
                                }
                                .padding(12).cardStyle()
                            }
                            if viewModel.dayTemplates.isEmpty {
                                EmptyStateView(icon: "calendar", title: "No Day Schedules", subtitle: "Capture a day to save as template")
                            }
                        } else {
                            ForEach(viewModel.tripTemplates) { tmpl in
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(tmpl.name ?? "Untitled").font(Theme.subheadlineFont).fontWeight(.semibold)
                                        Text("\(tmpl.pickupLocation ?? "") → \(tmpl.dropoffLocation ?? "")").font(Theme.captionFont).foregroundColor(Theme.gray500).lineLimit(1)
                                    }
                                    Spacer()
                                    Button("Use") { Task { await viewModel.createFromTemplate(id: tmpl.id) } }
                                        .font(.system(size: 11, weight: .medium)).foregroundColor(Theme.green)
                                        .padding(.horizontal, 8).padding(.vertical, 4)
                                        .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.green, lineWidth: 1))
                                    Button { Task { await viewModel.deleteTrip(id: tmpl.id) } } label: {
                                        Image(systemName: "trash").font(.system(size: 12)).foregroundColor(Theme.red)
                                    }
                                }
                                .padding(12).cardStyle()
                            }
                            if viewModel.tripTemplates.isEmpty {
                                EmptyStateView(icon: "doc.text", title: "No Trip Templates", subtitle: "Save trips as reusable templates")
                            }
                        }
                    }
                    .padding().padding(.bottom, 80)
                }
                .refreshable { await viewModel.loadData() }
            }
            .background(Theme.gray50.ignoresSafeArea())
            .navigationTitle("Templates").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button { viewModel.captureName = ""; viewModel.showCaptureSheet = true } label: { Image(systemName: "plus") }
                }
            }
            .task { await viewModel.loadData() }
            .alert("Capture Day", isPresented: $viewModel.showCaptureSheet) {
                TextField("Template Name", text: $viewModel.captureName)
                Button("Cancel", role: .cancel) {}
                Button("Capture") { Task { await viewModel.captureDay() } }
            } message: { Text("Save today's schedule as a reusable template") }
            .overlay {
                if let success = viewModel.actionSuccess {
                    SuccessToast(message: success).onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 2) { viewModel.actionSuccess = nil } }
                }
            }
        }
    }
}

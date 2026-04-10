import SwiftUI

struct TripRatingSheet: View {
    let tripId: String
    let onSubmit: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var rating: Int = 0
    @State private var comment: String = ""
    @State private var isSubmitting = false
    @State private var hasRated = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Text("Rate Your Trip")
                    .font(.title2.bold())

                Text("How was your ride?")
                    .foregroundColor(Theme.gray500)

                // Star rating
                HStack(spacing: 8) {
                    ForEach(1...5, id: \.self) { star in
                        Image(systemName: star <= rating ? "star.fill" : "star")
                            .font(.system(size: 36))
                            .foregroundColor(star <= rating ? .yellow : Theme.gray300)
                            .onTapGesture { rating = star }
                    }
                }
                .padding(.vertical, 8)

                TextField("Comment (optional)", text: $comment, axis: .vertical)
                    .lineLimit(3...6)
                    .textFieldStyle(.roundedBorder)
                    .padding(.horizontal)

                if hasRated {
                    Label("Already Rated", systemImage: "checkmark.circle.fill")
                        .foregroundColor(.green)
                } else {
                    Button {
                        submitRating()
                    } label: {
                        if isSubmitting {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("Submit Rating")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Theme.primary)
                    .disabled(rating == 0 || isSubmitting)
                    .padding(.horizontal)
                }

                Spacer()
            }
            .padding(.top, 24)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .task {
            await checkRating()
        }
    }

    private func checkRating() async {
        do {
            let result = try await APIService.shared.checkTripRating(tripId: tripId)
            if result.hasRated == true {
                hasRated = true
            }
        } catch {}
    }

    private func submitRating() {
        isSubmitting = true
        Task {
            do {
                let body: [String: Any] = [
                    "tripId": tripId,
                    "rating": rating,
                    "comment": comment,
                    "type": "trip"
                ]
                _ = try await APIService.shared.submitRating(body: body)
                onSubmit()
                dismiss()
            } catch {
                isSubmitting = false
            }
        }
    }
}

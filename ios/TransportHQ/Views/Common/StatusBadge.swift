import SwiftUI

struct StatusBadge: View {
    let text: String
    let color: Color

    init(_ text: String, color: Color) {
        self.text = text
        self.color = color
    }

    init(tripStatus: TripStatus) {
        self.text = tripStatus.displayName
        switch tripStatus {
        case .unassigned:
            self.color = Theme.gray400
        case .assigned:
            self.color = Theme.blue
        case .driverDeparted:
            self.color = Theme.orange
        case .arrivedPickup:
            self.color = Theme.primaryLight
        case .inProgress:
            self.color = Theme.green
        case .completed:
            self.color = Theme.gray500
        case .cancelled:
            self.color = Theme.red
        }
    }

    init(rideStatus: RideRequestStatus) {
        self.text = rideStatus.displayName
        switch rideStatus {
        case .pending:
            self.color = Theme.orange
        case .approved:
            self.color = Theme.blue
        case .assigned:
            self.color = Theme.primaryLight
        case .inProgress:
            self.color = Theme.green
        case .completed:
            self.color = Theme.gray500
        case .cancelled:
            self.color = Theme.gray400
        case .rejected:
            self.color = Theme.red
        }
    }

    init(vehicleStatus: VehicleStatus) {
        self.text = vehicleStatus.displayName
        switch vehicleStatus {
        case .available:
            self.color = Theme.green
        case .inUse:
            self.color = Theme.blue
        case .maintenance:
            self.color = Theme.orange
        case .outOfService:
            self.color = Theme.red
        }
    }

    init(priority: RidePriority) {
        self.text = priority.displayName
        switch priority {
        case .low:
            self.color = Theme.gray500
        case .normal:
            self.color = Theme.blue
        case .high:
            self.color = Theme.orange
        case .urgent:
            self.color = Theme.red
        }
    }

    var body: some View {
        Text(text)
            .font(Theme.smallFont)
            .foregroundColor(color)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(color.opacity(0.1))
            .cornerRadius(12)
    }
}

struct PulsingDot: View {
    @State private var isAnimating = false

    let color: Color

    var body: some View {
        ZStack {
            Circle()
                .fill(color.opacity(0.3))
                .frame(width: 16, height: 16)
                .scaleEffect(isAnimating ? 1.5 : 1.0)
                .opacity(isAnimating ? 0 : 0.6)

            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1.2).repeatForever(autoreverses: false)) {
                isAnimating = true
            }
        }
    }
}

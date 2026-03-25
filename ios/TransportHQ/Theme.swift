import SwiftUI

enum Theme {
    // MARK: - Colors
    static let primary = Color(hex: "4f46e5")
    static let primaryLight = Color(hex: "818cf8")
    static let primaryDark = Color(hex: "3730a3")
    static let green = Color(hex: "059669")
    static let greenLight = Color(hex: "34d399")
    static let orange = Color(hex: "d97706")
    static let red = Color(hex: "dc2626")
    static let blue = Color(hex: "2563eb")
    static let gray50 = Color(hex: "f9fafb")
    static let gray100 = Color(hex: "f3f4f6")
    static let gray200 = Color(hex: "e5e7eb")
    static let gray300 = Color(hex: "d1d5db")
    static let gray400 = Color(hex: "9ca3af")
    static let gray500 = Color(hex: "6b7280")
    static let gray600 = Color(hex: "4b5563")
    static let gray700 = Color(hex: "374151")
    static let gray800 = Color(hex: "1f2937")
    static let gray900 = Color(hex: "111827")

    // MARK: - Fonts
    static let titleFont = Font.system(size: 28, weight: .bold, design: .rounded)
    static let headlineFont = Font.system(size: 20, weight: .semibold, design: .rounded)
    static let subheadlineFont = Font.system(size: 16, weight: .medium)
    static let bodyFont = Font.system(size: 15, weight: .regular)
    static let captionFont = Font.system(size: 13, weight: .regular)
    static let smallFont = Font.system(size: 11, weight: .medium)

    // MARK: - Spacing
    static let paddingSmall: CGFloat = 8
    static let paddingMedium: CGFloat = 16
    static let paddingLarge: CGFloat = 24
    static let cornerRadius: CGFloat = 12
    static let cornerRadiusSmall: CGFloat = 8

    // MARK: - Shadows
    static let shadowColor = Color.black.opacity(0.08)
    static let shadowRadius: CGFloat = 8
    static let shadowY: CGFloat = 4
}

// MARK: - Color Extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - View Modifiers
struct CardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Color.white)
            .cornerRadius(Theme.cornerRadius)
            .shadow(color: Theme.shadowColor, radius: Theme.shadowRadius, x: 0, y: Theme.shadowY)
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    var color: Color = Theme.primary

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.subheadlineFont)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(color)
            .cornerRadius(Theme.cornerRadiusSmall)
            .opacity(configuration.isPressed ? 0.85 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardModifier())
    }
}

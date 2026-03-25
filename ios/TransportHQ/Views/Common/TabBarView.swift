import SwiftUI

struct TabBarView: View {
    let role: UserRole
    @Binding var selectedTab: Int

    var tabs: [(String, String)] {
        switch role {
        case .coordinator:
            return [
                ("Dashboard", "square.grid.2x2.fill"),
                ("Live Map", "map.fill"),
                ("Rides", "car.fill"),
                ("Trips", "road.lanes"),
                ("More", "ellipsis")
            ]
        case .driver:
            return [
                ("My Trips", "road.lanes"),
                ("My Rides", "car.fill"),
                ("More", "ellipsis")
            ]
        case .passenger:
            return [
                ("My Trips", "road.lanes"),
                ("My Rides", "car.fill"),
                ("More", "ellipsis")
            ]
        }
    }

    var body: some View {
        HStack {
            ForEach(0..<tabs.count, id: \.self) { index in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        selectedTab = index
                    }
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: tabs[index].1)
                            .font(.system(size: 20))
                        Text(tabs[index].0)
                            .font(.system(size: 10, weight: .medium))
                    }
                    .foregroundColor(selectedTab == index ? Theme.primary : Theme.gray400)
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .padding(.top, 8)
        .padding(.bottom, 4)
        .background(
            Color.white
                .shadow(color: Theme.shadowColor, radius: 8, x: 0, y: -4)
                .ignoresSafeArea(edges: .bottom)
        )
    }
}

// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "TransportHQ",
    platforms: [
        .iOS(.v16)
    ],
    dependencies: [
        .package(url: "https://github.com/socketio/socket.io-client-swift.git", from: "16.1.0")
    ],
    targets: [
        .executableTarget(
            name: "TransportHQ",
            dependencies: [
                .product(name: "SocketIO", package: "socket.io-client-swift")
            ],
            path: "."
        )
    ]
)

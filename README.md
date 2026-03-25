# TransportHQ

Production transportation management platform built for film & TV productions. Manage drivers, vehicles, ride requests, permanent allocations, and live GPS tracking — all from one dashboard.

## Features

### Coordinator Dashboard
- **Ride Requests** — Crew and talent submit pickup requests. Coordinators approve, assign drivers & vehicles, and track status in real-time
- **Permanent Allocations** — Assign a driver + vehicle to talent for a defined period. Supports draft mode, driver/vehicle swap with history, full-day trips, and self-managed routes
- **Live Tracking** — Google Maps with real-time driver positions, animated markers, traffic layer, geofence zones, driver trails, offline detection, and nearby driver suggestions
- **Fleet Management** — All production vehicles (cars, vans, SUVs, shuttles) in one place. Any driver can be assigned to any vehicle
- **Shared Routes** — Multiple crew members can share a car. Add stops and passengers to active rides on the fly. Smart suggestions show nearby cars already on route
- **Day Templates** — Capture an entire day's schedule and replay it on any future date with one click. "Same as Yesterday" instant setup
- **Insights** — Analytics dashboard with 30-day trip charts, driver performance rankings, cost analysis, and completion rates
- **Reports** — Daily summary, vehicle utilization, on-time performance, cost breakdown, and overtime tracking

### Driver View
- **My Trips** — Status flow buttons (Departing -> Arrived -> Picked Up -> Destination). Auto-starts GPS sharing during active trips
- **My Map** — Real-time position on Google Maps with speedometer, compass, route to pickup/dropoff, and navigation integration
- **My Rides** — View assigned ride requests and update status

### Passenger / Actor View
- **My Rides** — See ride status, driver info, and vehicle details
- **Track Driver Live** — Full-screen map showing driver's real-time position with ETA, speed, and route
- **Give Call** — Actors with a permanently allocated driver can dispatch them with one tap
- **My Permanent Driver** — Card showing allocated driver, vehicle, phone, and availability

### Core Capabilities
- Real-time Socket.IO for instant location updates, ride status changes, and notifications
- Location Picker with Google Maps search, click-to-place, draggable markers — every location stores coordinates
- Priority system (Urgent, High, Normal, Low)
- Multi-stop routes for cars and shuttles with different passengers at each stop
- Geofencing with enter/exit alerts
- Driver trail history and offline detection
- Day templates to save and replay entire day schedules

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, React Router v7 |
| Maps | Google Maps JavaScript API |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose |
| Real-time | Socket.IO |
| Auth | JWT (access + refresh tokens) |
| Charts | Recharts |

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally or a MongoDB Atlas URI
- Google Maps API key (for map features)

### Setup

```bash
# Clone
git clone https://github.com/AviralSinghPal/Transportation-tracking-App.git
cd Transportation-tracking-App

# Server
cd server
cp .env.example .env  # Add MONGODB_URI, JWT_SECRET, GOOGLE_MAPS_API_KEY
npm install
node seed.js          # Load demo data
node index.js         # Starts on port 5001

# Client (new terminal)
cd client
cp .env.example .env  # Add VITE_GOOGLE_MAPS_API_KEY
npm install
npx vite              # Starts on port 5173
```

### Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Coordinator | coordinator@test.com | password123 |
| Driver | driver@test.com | password123 |
| Actor | actor@test.com | password123 |

## Mobile Apps

Native mobile apps are included in `/android` (Kotlin + Jetpack Compose) and `/ios` (Swift + SwiftUI).

### Android
- Jetpack Compose + Material3 + Google Maps SDK
- Open in Android Studio, add Google Maps API key in `gradle.properties`, run

### iOS
- SwiftUI (iOS 16+) + MapKit + Socket.IO Swift
- Open in Xcode, resolve SPM packages, run

## Project Structure

```
TransportHQ/
├── client/                 # React frontend
│   └── src/
│       ├── components/     # Shared UI (LocationPicker, StatusBadge, Layout)
│       ├── context/        # Auth, Socket, Theme providers
│       └── pages/          # Coordinator, Driver, Passenger views
├── server/                 # Express backend
│   ├── models/             # MongoDB schemas
│   ├── routes/             # REST API endpoints
│   ├── socket/             # Socket.IO real-time handlers
│   ├── services/           # Google Maps, geocoding
│   └── seed.js             # Demo data seeder
├── android/                # Kotlin/Jetpack Compose app
└── ios/                    # Swift/SwiftUI app
```

## License

MIT

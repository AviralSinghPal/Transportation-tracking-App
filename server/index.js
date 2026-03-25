import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import connectDB from './config/db.js';
import { setupSocket } from './socket/index.js';

import authRoutes from './routes/auth.js';
import tripRoutes from './routes/trips.js';
import vehicleRoutes from './routes/vehicles.js';
import driverRoutes from './routes/drivers.js';
import notificationRoutes from './routes/notifications.js';
import analyticsRoutes from './routes/analytics.js';
import chatRoutes from './routes/chat.js';
import ratingRoutes from './routes/ratings.js';
import maintenanceRoutes from './routes/maintenance.js';
import documentRoutes from './routes/documents.js';
import productionRoutes from './routes/productions.js';
import templateRoutes from './routes/templates.js';
import rideRequestRoutes from './routes/rideRequests.js';
import allocationRoutes from './routes/allocations.js';
import talentRoutes from './routes/talent.js';
import shuttleRoutes from './routes/shuttles.js';
import reportRoutes from './routes/reports.js';
import trackingRoutes from './routes/tracking.js';
import geofenceRoutes from './routes/geofences.js';
import dayTemplateRoutes from './routes/dayTemplates.js';
import permanentTripRoutes from './routes/permanentTrips.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176').split(',');

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true }
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/productions', productionRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/ride-requests', rideRequestRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/talent', talentRoutes);
app.use('/api/shuttles', shuttleRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/geofences', geofenceRoutes);
app.use('/api/day-templates', dayTemplateRoutes);
app.use('/api/permanent-trips', permanentTripRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO
setupSocket(io);

// Start
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

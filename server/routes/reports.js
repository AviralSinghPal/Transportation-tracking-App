import { Router } from 'express';
import Trip from '../models/Trip.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import TripEvent from '../models/TripEvent.js';
import RideRequest from '../models/RideRequest.js';
import ShuttleRun from '../models/ShuttleRun.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.use(authorize('coordinator'));

// Daily transportation report
router.get('/daily', async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const [trips, rideRequests, shuttleRuns, vehicles, drivers] = await Promise.all([
      Trip.find({ date: { $gte: dayStart, $lt: dayEnd } })
        .populate('driver', 'name phone')
        .populate('vehicle', 'name type licensePlate')
        .populate('passengers.user', 'name'),
      RideRequest.find({ createdAt: { $gte: dayStart, $lt: dayEnd } })
        .populate('requester', 'name role')
        .populate('assignedDriver', 'name'),
      ShuttleRun.find({ scheduledDeparture: { $gte: dayStart, $lt: dayEnd } })
        .populate({ path: 'route', select: 'name type' }),
      Vehicle.find(),
      User.find({ role: 'driver', isActive: { $ne: false } })
    ]);

    // Calculate stats
    const totalTrips = trips.length;
    const completedTrips = trips.filter(t => t.status === 'completed').length;
    const activeTrips = trips.filter(t => ['assigned', 'driver-departed', 'in-progress'].includes(t.status)).length;
    const totalPassengers = trips.reduce((sum, t) => sum + (t.passengers?.length || 0), 0);
    const totalRideRequests = rideRequests.length;
    const completedRides = rideRequests.filter(r => r.status === 'completed').length;
    const totalShuttleRuns = shuttleRuns.length;
    const completedShuttleRuns = shuttleRuns.filter(r => r.status === 'completed').length;
    const totalShuttlePassengers = shuttleRuns.reduce((sum, r) => sum + (r.occupancy || 0), 0);

    // Vehicles in use
    const vehiclesInUse = vehicles.filter(v => v.status === 'in-use').length;
    const vehiclesAvailable = vehicles.filter(v => v.status === 'available').length;
    const vehiclesMaintenance = vehicles.filter(v => v.status === 'maintenance').length;

    // Drivers on duty (those assigned to trips today)
    const driversOnDuty = new Set(
      trips.filter(t => t.driver).map(t => t.driver._id?.toString() || t.driver.toString())
    ).size;

    // Cost summary
    const totalCost = trips.reduce((sum, t) => sum + (t.cost?.total || 0), 0);
    const totalMileage = trips.reduce((sum, t) => sum + (t.cost?.mileage || 0), 0);

    res.json({
      date: dayStart.toISOString(),
      summary: {
        totalTrips, completedTrips, activeTrips, totalPassengers,
        totalRideRequests, completedRides,
        totalShuttleRuns, completedShuttleRuns, totalShuttlePassengers,
        vehiclesInUse, vehiclesAvailable, vehiclesMaintenance,
        driversOnDuty, totalDrivers: drivers.length,
        totalCost, totalMileage
      },
      trips,
      rideRequests,
      shuttleRuns
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Driver timecards
router.get('/timecards', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 7));
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const drivers = await User.find({ role: 'driver', isActive: { $ne: false } }).select('name phone');

    const timecards = [];
    for (const driver of drivers) {
      const trips = await Trip.find({
        driver: driver._id,
        date: { $gte: start, $lte: end },
        status: { $in: ['completed', 'in-progress'] }
      });

      let totalHours = 0;
      let totalTrips = 0;
      let totalMiles = 0;
      const dailyBreakdown = {};

      for (const trip of trips) {
        totalTrips++;
        const hours = trip.cost?.driverHours || 0;
        totalHours += hours;
        totalMiles += trip.cost?.mileage || 0;

        const dayKey = new Date(trip.date).toISOString().split('T')[0];
        if (!dailyBreakdown[dayKey]) dailyBreakdown[dayKey] = { hours: 0, trips: 0 };
        dailyBreakdown[dayKey].hours += hours;
        dailyBreakdown[dayKey].trips += 1;
      }

      const regularHours = Math.min(totalHours, 8 * Object.keys(dailyBreakdown).length);
      const overtimeHours = Math.max(0, totalHours - regularHours);

      timecards.push({
        driver: { _id: driver._id, name: driver.name, phone: driver.phone },
        totalTrips,
        totalHours: Math.round(totalHours * 100) / 100,
        regularHours: Math.round(regularHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        totalMiles: Math.round(totalMiles * 100) / 100,
        dailyBreakdown,
        daysWorked: Object.keys(dailyBreakdown).length
      });
    }

    res.json(timecards.sort((a, b) => b.totalHours - a.totalHours));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Vehicle utilization
router.get('/vehicle-utilization', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const vehicles = await Vehicle.find().select('name type licensePlate capacity status');
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;

    const utilization = [];
    for (const vehicle of vehicles) {
      const trips = await Trip.find({
        vehicle: vehicle._id,
        date: { $gte: start, $lte: end }
      });

      const uniqueDays = new Set(trips.map(t => new Date(t.date).toISOString().split('T')[0]));
      const daysUsed = uniqueDays.size;
      const utilizationRate = Math.round((daysUsed / totalDays) * 100);
      const totalTrips = trips.length;
      const totalMiles = trips.reduce((sum, t) => sum + (t.cost?.mileage || 0), 0);
      const totalCost = trips.reduce((sum, t) => sum + (t.cost?.total || 0), 0);

      utilization.push({
        vehicle: { _id: vehicle._id, name: vehicle.name, type: vehicle.type, licensePlate: vehicle.licensePlate, status: vehicle.status },
        daysUsed,
        totalDays,
        utilizationRate,
        totalTrips,
        totalMiles: Math.round(totalMiles),
        totalCost: Math.round(totalCost * 100) / 100
      });
    }

    res.json(utilization.sort((a, b) => b.utilizationRate - a.utilizationRate));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// On-time performance
router.get('/on-time', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    const completedTrips = await Trip.find({
      date: { $gte: start, $lte: end },
      status: 'completed'
    }).populate('driver', 'name');

    let onTime = 0;
    let late = 0;
    const driverPerformance = {};

    for (const trip of completedTrips) {
      // Check if first passenger was picked up on time
      const firstPickup = trip.passengers?.[0];
      if (firstPickup && trip.startedAt && firstPickup.pickupTime) {
        const scheduledTime = new Date(firstPickup.pickupTime).getTime();
        const actualTime = new Date(trip.startedAt).getTime();
        const diffMinutes = (actualTime - scheduledTime) / 60000;

        // On time if within 10 minutes of scheduled
        if (diffMinutes <= 10) {
          onTime++;
        } else {
          late++;
        }

        // Track per driver
        const driverId = trip.driver?._id?.toString() || trip.driver?.toString();
        if (driverId) {
          if (!driverPerformance[driverId]) {
            driverPerformance[driverId] = { name: trip.driver?.name || 'Unknown', onTime: 0, late: 0, total: 0 };
          }
          driverPerformance[driverId].total++;
          if (diffMinutes <= 10) driverPerformance[driverId].onTime++;
          else driverPerformance[driverId].late++;
        }
      } else {
        onTime++; // Default to on-time if we can't determine
      }
    }

    const total = onTime + late;
    const onTimeRate = total > 0 ? Math.round((onTime / total) * 100) : 100;

    res.json({
      onTimeRate,
      onTime,
      late,
      total,
      driverPerformance: Object.values(driverPerformance).map(d => ({
        ...d,
        onTimeRate: d.total > 0 ? Math.round((d.onTime / d.total) * 100) : 100
      })).sort((a, b) => b.onTimeRate - a.onTimeRate)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cost analysis
router.get('/cost-analysis', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    const trips = await Trip.find({
      date: { $gte: start, $lte: end },
      'cost.total': { $gt: 0 }
    }).populate('driver', 'name').populate('vehicle', 'name type');

    const totalCost = trips.reduce((s, t) => s + (t.cost?.total || 0), 0);
    const totalMileage = trips.reduce((s, t) => s + (t.cost?.mileage || 0), 0);
    const totalFuel = trips.reduce((s, t) => s + (t.cost?.fuelCost || 0), 0);
    const totalTolls = trips.reduce((s, t) => s + (t.cost?.tolls || 0), 0);
    const totalDriverPay = trips.reduce((s, t) => s + ((t.cost?.driverHours || 0) * (t.cost?.driverRate || 0)), 0);
    const totalExtras = trips.reduce((s, t) => s + (t.cost?.extras || 0), 0);

    const costPerMile = totalMileage > 0 ? totalCost / totalMileage : 0;
    const costPerTrip = trips.length > 0 ? totalCost / trips.length : 0;

    // Daily cost trend
    const dailyCosts = {};
    for (const trip of trips) {
      const day = new Date(trip.date).toISOString().split('T')[0];
      if (!dailyCosts[day]) dailyCosts[day] = 0;
      dailyCosts[day] += trip.cost?.total || 0;
    }

    // Cost by vehicle type
    const costByVehicleType = {};
    for (const trip of trips) {
      const vType = trip.vehicle?.type || 'unknown';
      if (!costByVehicleType[vType]) costByVehicleType[vType] = 0;
      costByVehicleType[vType] += trip.cost?.total || 0;
    }

    res.json({
      totalCost: Math.round(totalCost * 100) / 100,
      totalMileage: Math.round(totalMileage),
      costPerMile: Math.round(costPerMile * 100) / 100,
      costPerTrip: Math.round(costPerTrip * 100) / 100,
      breakdown: {
        fuel: Math.round(totalFuel * 100) / 100,
        tolls: Math.round(totalTolls * 100) / 100,
        driverPay: Math.round(totalDriverPay * 100) / 100,
        extras: Math.round(totalExtras * 100) / 100
      },
      dailyCosts: Object.entries(dailyCosts).map(([date, cost]) => ({
        date,
        cost: Math.round(cost * 100) / 100
      })).sort((a, b) => a.date.localeCompare(b.date)),
      costByVehicleType: Object.entries(costByVehicleType).map(([type, cost]) => ({
        type,
        cost: Math.round(cost * 100) / 100
      })),
      totalTrips: trips.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Overtime trends
router.get('/overtime', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    const drivers = await User.find({ role: 'driver', isActive: { $ne: false } }).select('name');
    const trips = await Trip.find({
      date: { $gte: start, $lte: end },
      driver: { $exists: true }
    }).select('driver date cost');

    // Calculate daily hours per driver
    const dailyDriverHours = {};
    for (const trip of trips) {
      const driverId = trip.driver.toString();
      const day = new Date(trip.date).toISOString().split('T')[0];
      const key = `${driverId}_${day}`;
      if (!dailyDriverHours[key]) dailyDriverHours[key] = { driverId, day, hours: 0 };
      dailyDriverHours[key].hours += trip.cost?.driverHours || 0;
    }

    // Calculate OT per day
    const dailyOT = {};
    let totalOTHours = 0;
    let totalOTDays = 0;

    for (const entry of Object.values(dailyDriverHours)) {
      const ot = Math.max(0, entry.hours - 8);
      if (ot > 0) {
        if (!dailyOT[entry.day]) dailyOT[entry.day] = { date: entry.day, otHours: 0, drivers: 0 };
        dailyOT[entry.day].otHours += ot;
        dailyOT[entry.day].drivers++;
        totalOTHours += ot;
        totalOTDays++;
      }
    }

    // Per-driver OT summary
    const driverOT = {};
    for (const entry of Object.values(dailyDriverHours)) {
      const ot = Math.max(0, entry.hours - 8);
      if (!driverOT[entry.driverId]) driverOT[entry.driverId] = { totalOT: 0, otDays: 0 };
      if (ot > 0) {
        driverOT[entry.driverId].totalOT += ot;
        driverOT[entry.driverId].otDays++;
      }
    }

    const driverOTList = drivers.map(d => ({
      driver: { _id: d._id, name: d.name },
      totalOTHours: Math.round((driverOT[d._id.toString()]?.totalOT || 0) * 100) / 100,
      otDays: driverOT[d._id.toString()]?.otDays || 0
    })).filter(d => d.totalOTHours > 0).sort((a, b) => b.totalOTHours - a.totalOTHours);

    res.json({
      totalOTHours: Math.round(totalOTHours * 100) / 100,
      totalOTDays,
      dailyTrend: Object.values(dailyOT).sort((a, b) => a.date.localeCompare(b.date)),
      driverBreakdown: driverOTList
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

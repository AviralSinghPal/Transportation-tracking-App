import { Router } from 'express';
import Trip from '../models/Trip.js';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import Rating from '../models/Rating.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.use(authorize('coordinator'));

// Dashboard analytics
router.get('/dashboard', async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    const filter = Object.keys(dateFilter).length ? { date: dateFilter } : {};

    const [trips, drivers, vehicles] = await Promise.all([
      Trip.find(filter),
      User.find({ role: 'driver' }),
      Vehicle.find()
    ]);

    const completed = trips.filter(t => t.status === 'completed');
    const cancelled = trips.filter(t => t.status === 'cancelled');
    const totalCost = completed.reduce((sum, t) => sum + (t.cost?.total || 0), 0);
    const totalMileage = completed.reduce((sum, t) => sum + (t.cost?.mileage || 0), 0);

    // Trips per day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentTrips = trips.filter(t => new Date(t.date) >= thirtyDaysAgo);

    const tripsByDay = {};
    recentTrips.forEach(t => {
      const day = new Date(t.date).toISOString().split('T')[0];
      tripsByDay[day] = (tripsByDay[day] || 0) + 1;
    });

    // Trips by status
    const tripsByStatus = {};
    trips.forEach(t => {
      tripsByStatus[t.status] = (tripsByStatus[t.status] || 0) + 1;
    });

    // Trips by type
    const tripsByType = {};
    trips.forEach(t => {
      tripsByType[t.type] = (tripsByType[t.type] || 0) + 1;
    });

    // Top drivers by trip count
    const driverTrips = {};
    completed.forEach(t => {
      if (t.driver) {
        const id = t.driver.toString();
        driverTrips[id] = (driverTrips[id] || 0) + 1;
      }
    });

    const topDriverIds = Object.entries(driverTrips)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    const topDrivers = await User.find({ _id: { $in: topDriverIds } }).select('name');
    const topDriversData = topDriverIds.map(id => {
      const driver = topDrivers.find(d => d._id.toString() === id);
      return { name: driver?.name || 'Unknown', trips: driverTrips[id] };
    });

    res.json({
      overview: {
        totalTrips: trips.length,
        completedTrips: completed.length,
        cancelledTrips: cancelled.length,
        completionRate: trips.length ? Math.round((completed.length / trips.length) * 100) : 0,
        totalCost,
        totalMileage,
        avgCostPerTrip: completed.length ? Math.round(totalCost / completed.length) : 0,
        totalDrivers: drivers.length,
        activeDrivers: drivers.filter(d => d.isAvailable).length,
        totalVehicles: vehicles.length,
        availableVehicles: vehicles.filter(v => v.status === 'available').length
      },
      tripsByDay: Object.entries(tripsByDay).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
      tripsByStatus: Object.entries(tripsByStatus).map(([status, count]) => ({ status, count })),
      tripsByType: Object.entries(tripsByType).map(([type, count]) => ({ type, count })),
      topDrivers: topDriversData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Driver performance stats
router.get('/driver-performance', async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver' }).select('-password');
    const allTrips = await Trip.find({ driver: { $ne: null } });
    const ratings = await Rating.find({ type: 'passenger-to-driver' });

    const performance = drivers.map(driver => {
      const driverTrips = allTrips.filter(t => t.driver?.toString() === driver._id.toString());
      const completed = driverTrips.filter(t => t.status === 'completed');
      const driverRatings = ratings.filter(r => r.ratedUser.toString() === driver._id.toString());
      const avgRating = driverRatings.length
        ? (driverRatings.reduce((s, r) => s + r.rating, 0) / driverRatings.length).toFixed(1)
        : null;
      const totalMileage = completed.reduce((s, t) => s + (t.cost?.mileage || 0), 0);
      const totalHours = completed.reduce((s, t) => s + (t.cost?.driverHours || 0), 0);

      return {
        _id: driver._id,
        name: driver.name,
        phone: driver.phone,
        isAvailable: driver.isAvailable,
        totalTrips: driverTrips.length,
        completedTrips: completed.length,
        completionRate: driverTrips.length ? Math.round((completed.length / driverTrips.length) * 100) : 0,
        avgRating: avgRating ? parseFloat(avgRating) : null,
        totalRatings: driverRatings.length,
        totalMileage,
        totalHours
      };
    });

    res.json(performance.sort((a, b) => b.completedTrips - a.completedTrips));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cost report
router.get('/costs', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = { status: 'completed' };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const trips = await Trip.find(filter)
      .populate('driver', 'name')
      .populate('vehicle', 'name type')
      .sort({ date: -1 });

    const totalCost = trips.reduce((s, t) => s + (t.cost?.total || 0), 0);
    const totalMileage = trips.reduce((s, t) => s + (t.cost?.mileage || 0), 0);
    const totalFuel = trips.reduce((s, t) => s + (t.cost?.fuelCost || 0), 0);
    const totalTolls = trips.reduce((s, t) => s + (t.cost?.tolls || 0), 0);

    res.json({
      summary: { totalCost, totalMileage, totalFuel, totalTolls, tripCount: trips.length },
      trips: trips.map(t => ({
        _id: t._id,
        title: t.title,
        date: t.date,
        driver: t.driver?.name,
        vehicle: t.vehicle?.name,
        cost: t.cost
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

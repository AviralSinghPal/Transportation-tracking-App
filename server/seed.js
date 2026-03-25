import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Vehicle from './models/Vehicle.js';
import Trip from './models/Trip.js';
import RideRequest from './models/RideRequest.js';
import Notification from './models/Notification.js';
import ShuttleRoute from './models/ShuttleRoute.js';
import ShuttleRun from './models/ShuttleRun.js';
import TalentProfile from './models/TalentProfile.js';
import Maintenance from './models/Maintenance.js';
import Rating from './models/Rating.js';

dotenv.config();

function hours(h, m = 0) {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear ALL existing data
  await Promise.all([
    User.deleteMany({}),
    Vehicle.deleteMany({}),
    Trip.deleteMany({}),
    RideRequest.deleteMany({}),
    Notification.deleteMany({}),
    ShuttleRoute.deleteMany({}),
    ShuttleRun.deleteMany({}),
    TalentProfile.deleteMany({}),
    Maintenance.deleteMany({}),
    Rating.deleteMany({})
  ]);
  console.log('Cleared existing data');

  // =====================
  // USERS
  // =====================

  const coordinator = await User.create({
    name: 'Sarah Mitchell',
    email: 'coordinator@test.com',
    password: 'password123',
    role: 'coordinator',
    phone: '+1 (310) 555-0100'
  });

  const coordinator2 = await User.create({
    name: 'David Chen',
    email: 'coordinator2@test.com',
    password: 'password123',
    role: 'coordinator',
    phone: '+1 (310) 555-0101'
  });

  const driver1 = await User.create({
    name: 'Mike Rodriguez',
    email: 'driver1@test.com',
    password: 'password123',
    role: 'driver',
    phone: '+1 (310) 555-0201',
    licenseNumber: 'DL-4482901',
    licenseExpiry: new Date('2027-12-31'),
    isAvailable: true,
    lastLocation: { lat: 34.0622, lng: -118.2537, updatedAt: new Date() }
  });

  const driver2 = await User.create({
    name: 'Jane Thompson',
    email: 'driver2@test.com',
    password: 'password123',
    role: 'driver',
    phone: '+1 (310) 555-0202',
    licenseNumber: 'DL-7723104',
    licenseExpiry: new Date('2026-06-30'),
    isAvailable: true,
    lastLocation: { lat: 34.0722, lng: -118.2637, updatedAt: new Date() }
  });

  const driver3 = await User.create({
    name: 'Tom Jackson',
    email: 'driver3@test.com',
    password: 'password123',
    role: 'driver',
    phone: '+1 (310) 555-0203',
    licenseNumber: 'DL-3319057',
    licenseExpiry: new Date('2027-03-15'),
    isAvailable: true,
    lastLocation: { lat: 34.0452, lng: -118.2337, updatedAt: new Date() }
  });

  const driver4 = await User.create({
    name: 'Lisa Park',
    email: 'driver4@test.com',
    password: 'password123',
    role: 'driver',
    phone: '+1 (310) 555-0204',
    licenseNumber: 'DL-9918234',
    licenseExpiry: new Date('2028-01-20'),
    isAvailable: false
  });

  const actor1 = await User.create({
    name: 'Chris Evans',
    email: 'actor1@test.com',
    password: 'password123',
    role: 'passenger',
    phone: '+1 (310) 555-0301'
  });

  const actor2 = await User.create({
    name: 'Emma Stone',
    email: 'actor2@test.com',
    password: 'password123',
    role: 'passenger',
    phone: '+1 (310) 555-0302'
  });

  const actor3 = await User.create({
    name: 'Ryan Gosling',
    email: 'actor3@test.com',
    password: 'password123',
    role: 'passenger',
    phone: '+1 (310) 555-0303'
  });

  const crewMember = await User.create({
    name: 'Alex Kim',
    email: 'crew1@test.com',
    password: 'password123',
    role: 'passenger',
    phone: '+1 (310) 555-0401'
  });

  console.log('Created users');

  // =====================
  // VEHICLES
  // =====================

  const car1 = await Vehicle.create({
    name: 'Tesla Model X #1',
    type: 'suv',
    licensePlate: '8ABC123',
    capacity: 5,
    status: 'in-use',
    mileage: 12450,
    fuelType: 'electric',
    lastServiceDate: daysAgo(30),
    nextServiceDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    insuranceExpiry: new Date('2027-03-01'),
    registrationExpiry: new Date('2027-01-15')
  });

  const car2 = await Vehicle.create({
    name: 'Mercedes S-Class #2',
    type: 'car',
    licensePlate: '7DEF456',
    capacity: 4,
    status: 'in-use',
    mileage: 34200,
    fuelType: 'gasoline',
    lastServiceDate: daysAgo(15),
    nextServiceDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
    insuranceExpiry: new Date('2026-11-01'),
    registrationExpiry: new Date('2027-02-28')
  });

  const van1 = await Vehicle.create({
    name: 'Sprinter Van #1',
    type: 'van',
    licensePlate: '6GHI789',
    capacity: 12,
    status: 'available',
    mileage: 67800,
    fuelType: 'diesel',
    lastServiceDate: daysAgo(10),
    nextServiceDate: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
    insuranceExpiry: new Date('2026-09-15'),
    registrationExpiry: new Date('2026-12-31')
  });

  const suv1 = await Vehicle.create({
    name: 'Cadillac Escalade #3',
    type: 'suv',
    licensePlate: '5JKL012',
    capacity: 7,
    status: 'available',
    mileage: 22100,
    fuelType: 'gasoline',
    lastServiceDate: daysAgo(45),
    nextServiceDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    insuranceExpiry: new Date('2027-05-01'),
    registrationExpiry: new Date('2027-04-15')
  });

  const minibus = await Vehicle.create({
    name: 'Crew Shuttle Bus',
    type: 'minibus',
    licensePlate: '4MNO345',
    capacity: 20,
    status: 'available',
    mileage: 89500,
    fuelType: 'diesel',
    lastServiceDate: daysAgo(5),
    nextServiceDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    insuranceExpiry: new Date('2026-08-01'),
    registrationExpiry: new Date('2026-07-31')
  });

  const car3 = await Vehicle.create({
    name: 'BMW 7 Series #4',
    type: 'car',
    licensePlate: '3PQR678',
    capacity: 4,
    status: 'maintenance',
    mileage: 45600,
    fuelType: 'hybrid',
    notes: 'Brake pad replacement in progress',
    lastServiceDate: new Date(),
    insuranceExpiry: new Date('2027-01-01'),
    registrationExpiry: new Date('2026-12-01')
  });

  console.log('Created vehicles');

  // =====================
  // PERMANENT ALLOCATIONS
  // =====================
  // PA: Mike → Chris Evans + Tesla Model X (actor gives call)
  await User.findByIdAndUpdate(driver1._id, {
    permanentAllocation: {
      allocatedTo: actor1._id,
      vehicle: car1._id,
      callConfig: 'actor',
      isTemporaryRelease: false
    }
  });
  await User.findByIdAndUpdate(actor1._id, { myDriver: driver1._id });
  await Vehicle.findByIdAndUpdate(car1._id, { permanentDriver: driver1._id });

  // PA: Jane → Emma Stone + Mercedes S-Class (coordinator gives call)
  await User.findByIdAndUpdate(driver2._id, {
    permanentAllocation: {
      allocatedTo: actor2._id,
      vehicle: car2._id,
      callConfig: 'coordinator',
      isTemporaryRelease: false
    }
  });
  await User.findByIdAndUpdate(actor2._id, { myDriver: driver2._id });
  await Vehicle.findByIdAndUpdate(car2._id, { permanentDriver: driver2._id });

  console.log('Created permanent allocations');

  // =====================
  // TRIPS - TODAY
  // =====================
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Trip 1: In progress - driver departed (Mike → Chris)
  const trip1 = await Trip.create({
    title: 'Chris Evans → Film Set',
    date: today,
    type: 'one-time',
    status: 'driver-departed',
    driver: driver1._id,
    vehicle: car1._id,
    startedAt: hours(6, 45),
    passengers: [{
      user: actor1._id,
      name: 'Chris Evans',
      phone: '+1 (310) 555-0301',
      pickupAddress: 'The Beverly Hilton, 9876 Wilshire Blvd, Beverly Hills',
      pickupLat: 34.0637,
      pickupLng: -118.4154,
      pickupTime: hours(7, 0),
      dropoffAddress: 'Warner Bros Studio, 3400 Warner Blvd, Burbank',
      dropoffLat: 34.1507,
      dropoffLng: -118.3390,
      dropoffTime: hours(7, 45),
      status: 'waiting'
    }],
    notes: 'VIP - lead actor. Call 5 min before arrival.',
    estimatedDuration: 45
  });

  // Trip 2: Assigned (Jane → Emma)
  const trip2 = await Trip.create({
    title: 'Emma Stone → Wardrobe Fitting',
    date: today,
    type: 'one-time',
    status: 'assigned',
    driver: driver2._id,
    vehicle: car2._id,
    passengers: [{
      user: actor2._id,
      name: 'Emma Stone',
      phone: '+1 (310) 555-0302',
      pickupAddress: 'Chateau Marmont, 8221 Sunset Blvd, West Hollywood',
      pickupLat: 34.0987,
      pickupLng: -118.3629,
      pickupTime: hours(10, 0),
      dropoffAddress: 'Costume Dept, Paramount Studios, 5555 Melrose Ave',
      dropoffLat: 34.0837,
      dropoffLng: -118.3193,
      dropoffTime: hours(10, 30),
      status: 'waiting'
    }],
    notes: 'Fitting at 10:30 sharp. Don\'t be late.',
    estimatedDuration: 30
  });

  // Trip 3: Unassigned - needs coordinator action
  const trip3 = await Trip.create({
    title: 'Crew Shuttle → Malibu Location',
    date: today,
    type: 'one-time',
    status: 'unassigned',
    passengers: [
      {
        name: 'Camera Dept (4 people)',
        pickupAddress: 'Production Office, 1234 Vine St, Hollywood',
        pickupTime: hours(5, 30),
        dropoffAddress: 'El Matador Beach, Malibu',
      },
      {
        name: 'Sound Dept (2 people)',
        pickupAddress: 'Equipment Rental, 5678 Cahuenga Blvd',
        pickupTime: hours(5, 45),
        dropoffAddress: 'El Matador Beach, Malibu',
      },
      {
        name: 'Art Dept (3 people)',
        pickupAddress: 'Art Studio, 910 La Brea Ave',
        pickupTime: hours(6, 0),
        dropoffAddress: 'El Matador Beach, Malibu',
      }
    ],
    notes: 'Need large vehicle for equipment. Call time is 7:00 AM.'
  });

  // Trip 4: Assigned - afternoon pickup (Tom → Ryan)
  const trip4 = await Trip.create({
    title: 'Ryan Gosling → Night Scene',
    date: today,
    type: 'one-time',
    status: 'assigned',
    driver: driver3._id,
    vehicle: suv1._id,
    passengers: [{
      user: actor3._id,
      name: 'Ryan Gosling',
      phone: '+1 (310) 555-0303',
      pickupAddress: 'Four Seasons, 300 S Doheny Dr, Los Angeles',
      pickupLat: 34.0700,
      pickupLng: -118.3890,
      pickupTime: hours(17, 0),
      dropoffAddress: '6th Street Bridge, Downtown LA',
      dropoffLat: 34.0339,
      dropoffLng: -118.2260,
      dropoffTime: hours(17, 45),
      status: 'waiting'
    }],
    notes: 'Night scene shoot. Talent needs to be in H&MU by 6 PM.',
    estimatedDuration: 40
  });

  // Trip 5: Completed earlier today
  const trip5 = await Trip.create({
    title: 'Background Actors → Base Camp',
    date: today,
    type: 'one-time',
    status: 'completed',
    driver: driver3._id,
    vehicle: van1._id,
    startedAt: hours(4, 30),
    completedAt: hours(5, 15),
    passengers: [
      {
        name: 'Background Group A (8 people)',
        pickupAddress: 'Parking Lot C, Universal City',
        pickupTime: hours(4, 30),
        dropoffAddress: 'Base Camp, Stage 12',
        status: 'dropped-off'
      }
    ],
    cost: { mileage: 12, fuelCost: 8.50, driverHours: 1, driverRate: 35, total: 55.50 }
  });

  // Trip 6: Completed yesterday
  const yesterday = daysAgo(1);
  const trip6 = await Trip.create({
    title: 'Chris Evans → Hotel (Wrap)',
    date: yesterday,
    type: 'one-time',
    status: 'completed',
    driver: driver1._id,
    vehicle: car1._id,
    startedAt: new Date(yesterday.getTime() + 20 * 60 * 60 * 1000),
    completedAt: new Date(yesterday.getTime() + 21 * 60 * 60 * 1000),
    passengers: [{
      user: actor1._id,
      name: 'Chris Evans',
      pickupAddress: 'Warner Bros Studio, Burbank',
      pickupTime: new Date(yesterday.getTime() + 20 * 60 * 60 * 1000),
      dropoffAddress: 'The Beverly Hilton, Beverly Hills',
      dropoffTime: new Date(yesterday.getTime() + 21 * 60 * 60 * 1000),
      status: 'dropped-off'
    }],
    rating: 5,
    cost: { mileage: 18, fuelCost: 0, driverHours: 1, driverRate: 35, total: 35 }
  });

  // =====================
  // HISTORICAL TRIPS (past 30 days for analytics charts)
  // =====================
  const drivers = [driver1, driver2, driver3];
  const vehicles = [car1, car2, van1, suv1, minibus];
  const passengers = [actor1, actor2, actor3, crewMember];
  const tripTitles = [
    'Talent → Film Set', 'Crew → Location B', 'Background → Base Camp',
    'Talent → Hotel (Wrap)', 'Equipment Run', 'Wardrobe Fitting Transport',
    'Airport Pickup', 'Set → Craft Services', 'Director → Scouting Location',
    'Crew Shuttle → Night Shoot', 'VIP → Press Junket', 'Stunt Team → Rigging Site'
  ];
  const pickups = [
    'The Beverly Hilton, Beverly Hills', 'Chateau Marmont, West Hollywood',
    'Four Seasons, Los Angeles', 'Base Camp, Stage 12', 'Production Office, Hollywood',
    'LAX Airport, Terminal 4', 'Parking Lot C, Universal City', 'Equipment Rental, Cahuenga Blvd'
  ];
  const dropoffs = [
    'Warner Bros Studio, Burbank', 'Paramount Studios, Melrose Ave', 'El Matador Beach, Malibu',
    'Stage 8 - Main Set', '6th Street Bridge, Downtown LA', 'Costume Dept, Studio City',
    'Base Camp, Stage 12', 'Santa Clarita Valley, Film Ranch'
  ];

  for (let d = 2; d <= 28; d++) {
    const day = daysAgo(d);
    const tripsPerDay = Math.floor(Math.random() * 4) + 2; // 2-5 trips per day

    for (let t = 0; t < tripsPerDay; t++) {
      const driverIdx = t % drivers.length;
      const vehicleIdx = t % vehicles.length;
      const passengerIdx = t % passengers.length;
      const titleIdx = (d + t) % tripTitles.length;
      const pickupIdx = (d + t) % pickups.length;
      const dropoffIdx = (d + t + 1) % dropoffs.length;
      const startHour = 5 + Math.floor(Math.random() * 14); // 5 AM to 7 PM
      const durationHours = 1 + Math.random() * 2;
      const mileage = Math.floor(Math.random() * 35) + 5;
      const fuelCost = Math.round(mileage * 0.45 * 100) / 100;
      const driverRate = 35;
      const totalCost = Math.round((fuelCost + driverRate * durationHours) * 100) / 100;

      const isCancelled = Math.random() < 0.08; // 8% cancellation rate

      await Trip.create({
        title: tripTitles[titleIdx],
        date: day,
        type: 'one-time',
        status: isCancelled ? 'cancelled' : 'completed',
        driver: drivers[driverIdx]._id,
        vehicle: vehicles[vehicleIdx]._id,
        startedAt: new Date(day.getTime() + startHour * 60 * 60 * 1000),
        completedAt: isCancelled ? undefined : new Date(day.getTime() + (startHour + durationHours) * 60 * 60 * 1000),
        passengers: [{
          user: passengers[passengerIdx]._id,
          name: passengers[passengerIdx].name || 'Crew Member',
          pickupAddress: pickups[pickupIdx],
          pickupTime: new Date(day.getTime() + startHour * 60 * 60 * 1000),
          dropoffAddress: dropoffs[dropoffIdx],
          dropoffTime: new Date(day.getTime() + (startHour + durationHours) * 60 * 60 * 1000),
          status: isCancelled ? 'waiting' : 'dropped-off'
        }],
        cost: isCancelled ? undefined : {
          mileage,
          fuelCost,
          driverHours: Math.round(durationHours * 10) / 10,
          driverRate,
          tolls: Math.random() < 0.3 ? Math.round(Math.random() * 8 * 100) / 100 : 0,
          total: totalCost
        },
        rating: isCancelled ? undefined : (Math.random() < 0.6 ? Math.floor(Math.random() * 2) + 4 : undefined) // 60% have 4-5 star ratings
      });
    }
  }

  // Add more historical ratings
  const completedHistorical = await Trip.find({ status: 'completed', rating: { $gte: 1 } }).limit(20);
  for (const trip of completedHistorical.slice(0, 15)) {
    if (!trip.driver) continue;
    const existing = await Rating.findOne({ trip: trip._id });
    if (existing) continue;
    try { await Rating.create({
      trip: trip._id,
      ratedBy: passengers[Math.floor(Math.random() * passengers.length)]._id,
      ratedUser: trip.driver,
      rating: trip.rating || (Math.floor(Math.random() * 2) + 4),
      comment: ['Great driver!', 'Very punctual.', 'Smooth ride.', 'Professional service.', 'On time, thank you!'][Math.floor(Math.random() * 5)],
      type: 'passenger-to-driver'
    }); } catch(e) { /* skip duplicates */ }
  }

  console.log('Created trips (including 30-day history for analytics)');

  // =====================
  // RIDE REQUESTS
  // =====================

  // Pending ride request (from crew member)
  const ride1 = await RideRequest.create({
    requester: crewMember._id,
    department: 'camera',
    pickupLocation: 'Equipment Room, Stage 5',
    dropoffLocation: 'Malibu Beach Location',
    pickupTime: hours(11, 0),
    passengerCount: 2,
    priority: 'normal',
    notes: 'Need help loading camera gear',
    status: 'pending'
  });

  // Pending urgent ride (from actor)
  const ride2 = await RideRequest.create({
    requester: actor3._id,
    department: 'talent',
    pickupLocation: 'Hair & Makeup Trailer',
    dropoffLocation: 'Stage 8 - Main Set',
    pickupTime: hours(14, 30),
    passengerCount: 1,
    priority: 'urgent',
    notes: 'Needed on set ASAP for reshoot',
    status: 'pending'
  });

  // Approved but not yet assigned
  const ride3 = await RideRequest.create({
    requester: actor2._id,
    department: 'talent',
    pickupLocation: 'Paramount Studios, Costume Dept',
    dropoffLocation: 'Chateau Marmont Hotel',
    pickupTime: hours(13, 0),
    passengerCount: 1,
    priority: 'high',
    notes: 'After wardrobe fitting',
    status: 'approved',
    approvedBy: coordinator._id,
    approvedAt: new Date()
  });

  // Assigned ride (Mike driving Chris) - this one can be tracked!
  const ride4 = await RideRequest.create({
    requester: actor1._id,
    department: 'talent',
    pickupLocation: 'The Beverly Hilton, Beverly Hills',
    dropoffLocation: 'Warner Bros Studio, Burbank',
    pickupTime: hours(7, 0),
    passengerCount: 1,
    priority: 'urgent',
    status: 'assigned',
    assignedDriver: driver1._id,
    assignedVehicle: car1._id,
    approvedBy: coordinator._id,
    approvedAt: hours(6, 30),
    eta: 15
  });

  // In-progress ride
  const ride5 = await RideRequest.create({
    requester: crewMember._id,
    department: 'production',
    pickupLocation: 'Production Office, Hollywood',
    dropoffLocation: 'Craft Services, Base Camp',
    pickupTime: hours(8, 0),
    passengerCount: 3,
    priority: 'low',
    notes: 'Picking up catering supplies',
    status: 'in-progress',
    assignedDriver: driver3._id,
    assignedVehicle: van1._id,
    approvedBy: coordinator._id,
    approvedAt: hours(7, 30)
  });

  // Completed rides (history)
  await RideRequest.create({
    requester: actor1._id,
    department: 'talent',
    pickupLocation: 'Warner Bros Studio, Burbank',
    dropoffLocation: 'The Beverly Hilton, Beverly Hills',
    pickupTime: new Date(yesterday.getTime() + 20 * 60 * 60 * 1000),
    passengerCount: 1,
    priority: 'urgent',
    status: 'completed',
    assignedDriver: driver1._id,
    assignedVehicle: car1._id,
    approvedBy: coordinator._id,
    approvedAt: new Date(yesterday.getTime() + 19 * 60 * 60 * 1000),
    completedAt: new Date(yesterday.getTime() + 21 * 60 * 60 * 1000)
  });

  await RideRequest.create({
    requester: actor2._id,
    department: 'talent',
    pickupLocation: 'LAX Airport, Terminal 4',
    dropoffLocation: 'Chateau Marmont Hotel',
    pickupTime: new Date(daysAgo(2).getTime() + 15 * 60 * 60 * 1000),
    passengerCount: 1,
    priority: 'urgent',
    notes: 'Flight lands at 3 PM',
    status: 'completed',
    assignedDriver: driver2._id,
    assignedVehicle: car2._id,
    approvedBy: coordinator._id,
    completedAt: new Date(daysAgo(2).getTime() + 16 * 60 * 60 * 1000)
  });

  await RideRequest.create({
    requester: crewMember._id,
    department: 'grip',
    pickupLocation: 'Grip Truck, Parking Lot B',
    dropoffLocation: 'Stage 12, Base Camp',
    pickupTime: new Date(yesterday.getTime() + 5 * 60 * 60 * 1000),
    passengerCount: 4,
    priority: 'high',
    status: 'completed',
    assignedDriver: driver3._id,
    completedAt: new Date(yesterday.getTime() + 5.5 * 60 * 60 * 1000)
  });

  // Rejected ride
  await RideRequest.create({
    requester: crewMember._id,
    department: 'other',
    pickupLocation: 'Base Camp',
    dropoffLocation: 'Santa Monica Pier',
    pickupTime: new Date(daysAgo(3).getTime() + 22 * 60 * 60 * 1000),
    passengerCount: 6,
    priority: 'low',
    notes: 'Team dinner outing',
    status: 'rejected',
    rejectionReason: 'Personal outings not covered by production transport'
  });

  // Shared ride example — crew shuttle car with multiple stops
  await RideRequest.create({
    requester: crewMember._id,
    department: 'production',
    pickupLocation: 'Crew Hotel, West Hollywood',
    dropoffLocation: 'Stage 8 - Main Set',
    pickupTime: hours(6, 30),
    passengerCount: 3,
    priority: 'normal',
    status: 'in-progress',
    assignedDriver: driver3._id,
    assignedVehicle: van1._id,
    isSharedRide: true,
    stops: [
      { location: 'Crew Hotel, West Hollywood', action: 'pickup', passengers: [{ user: crewMember._id, name: 'Alex Kim' }], order: 1, status: 'completed', completedAt: hours(6, 35) },
      { location: 'Coffee Bean, Sunset Blvd', action: 'pickup', passengers: [{ name: 'Camera Op - Jake' }], order: 2, status: 'completed', completedAt: hours(6, 45) },
      { location: 'Hair & Makeup Trailer', action: 'dropoff', passengers: [{ name: 'Camera Op - Jake' }], order: 3, status: 'pending' },
      { location: 'Stage 8 - Main Set', action: 'dropoff', passengers: [{ user: crewMember._id, name: 'Alex Kim' }], order: 4, status: 'pending' }
    ],
    sharedPassengers: [
      { user: crewMember._id, name: 'Alex Kim', pickupLocation: 'Crew Hotel, West Hollywood', dropoffLocation: 'Stage 8 - Main Set', status: 'picked-up' },
      { name: 'Camera Op - Jake', pickupLocation: 'Coffee Bean, Sunset Blvd', dropoffLocation: 'Hair & Makeup Trailer', status: 'picked-up' }
    ],
    approvedBy: coordinator._id
  });

  // Mark Ryan Gosling as having own transport
  await User.findByIdAndUpdate(actor3._id, {
    hasOwnTransport: true,
    ownTransportNotes: 'Has personal SUV + driver (James). Not tracked in system.'
  });

  console.log('Created ride requests (incl. shared rides)');

  // =====================
  // NOTIFICATIONS
  // =====================

  // For coordinator
  await Notification.create({
    user: coordinator._id,
    type: 'ride-request',
    title: 'New Ride Request',
    message: 'Alex Kim (Camera) requested a ride to Malibu Beach Location',
    read: false
  });

  await Notification.create({
    user: coordinator._id,
    type: 'ride-request',
    title: 'Urgent Ride Request',
    message: 'Ryan Gosling needs immediate transport to Stage 8',
    read: false
  });

  await Notification.create({
    user: coordinator._id,
    type: 'trip-updated',
    title: 'Driver Departed',
    message: 'Mike Rodriguez departed for Chris Evans pickup at Beverly Hilton',
    trip: trip1._id,
    read: true
  });

  // For driver1 (Mike)
  await Notification.create({
    user: driver1._id,
    type: 'trip-assigned',
    title: 'Trip Assigned',
    message: 'You\'ve been assigned: Chris Evans → Warner Bros Studio. Pickup at 7:00 AM.',
    trip: trip1._id,
    read: true
  });

  await Notification.create({
    user: driver1._id,
    type: 'ride-assigned',
    title: 'Ride Pickup Assigned',
    message: 'Pick up Chris Evans at The Beverly Hilton. ETA: 15 min.',
    read: false
  });

  // For actor1 (Chris)
  await Notification.create({
    user: actor1._id,
    type: 'ride-eta',
    title: 'Driver Assigned',
    message: 'Mike Rodriguez is your driver. ETA ~15 minutes in a Tesla Model X.',
    read: true
  });

  await Notification.create({
    user: actor1._id,
    type: 'driver-on-way',
    title: 'Driver On The Way',
    message: 'Mike Rodriguez has departed and is heading to your pickup location.',
    read: false
  });

  // For actor2 (Emma)
  await Notification.create({
    user: actor2._id,
    type: 'trip-assigned',
    title: 'Trip Scheduled',
    message: 'Your wardrobe fitting transport is confirmed. Jane Thompson will pick you up at 10:00 AM.',
    trip: trip2._id,
    read: true
  });

  await Notification.create({
    user: actor2._id,
    type: 'ride-request',
    title: 'Ride Approved',
    message: 'Your return ride from Paramount Studios has been approved.',
    read: false
  });

  console.log('Created notifications');

  // =====================
  // SHUTTLE ROUTES
  // =====================

  const shuttle1 = await ShuttleRoute.create({
    name: 'Base Camp ↔ Set (Stage 12)',
    type: 'crew',
    stops: [
      { name: 'Crew Parking Lot A', address: 'Lot A, Universal City', order: 1, estimatedTime: '06:00' },
      { name: 'Base Camp', address: 'Base Camp, Near Stage 5', order: 2, estimatedTime: '06:10' },
      { name: 'Hair & Makeup', address: 'H&MU Trailers', order: 3, estimatedTime: '06:15' },
      { name: 'Main Set - Stage 12', address: 'Stage 12', order: 4, estimatedTime: '06:20' }
    ],
    frequency: 20,
    startTime: '05:30',
    endTime: '22:00',
    capacity: 20,
    assignedVehicle: minibus._id,
    assignedDriver: driver4._id,
    isActive: true,
    daysActive: [1, 2, 3, 4, 5],
    notes: 'Primary crew shuttle. Runs every 20 min during shoot days.'
  });

  const shuttle2 = await ShuttleRoute.create({
    name: 'Hotel Loop',
    type: 'crew',
    stops: [
      { name: 'Beverly Hilton', address: '9876 Wilshire Blvd, Beverly Hills', order: 1, estimatedTime: '06:00' },
      { name: 'Chateau Marmont', address: '8221 Sunset Blvd', order: 2, estimatedTime: '06:15' },
      { name: 'Four Seasons', address: '300 S Doheny Dr', order: 3, estimatedTime: '06:25' },
      { name: 'Base Camp', address: 'Base Camp', order: 4, estimatedTime: '06:45' }
    ],
    frequency: 60,
    startTime: '06:00',
    endTime: '23:00',
    capacity: 12,
    isActive: true,
    daysActive: [1, 2, 3, 4, 5, 6],
    notes: 'Hotel pickup/dropoff loop for cast and key crew.'
  });

  // Shuttle runs for today
  for (let h = 6; h <= 10; h++) {
    await ShuttleRun.create({
      route: shuttle1._id,
      driver: driver4._id,
      vehicle: minibus._id,
      scheduledDeparture: hours(h, 0),
      actualDeparture: h <= 8 ? hours(h, 2) : undefined,
      arrivalTime: h <= 7 ? hours(h, 22) : undefined,
      status: h <= 7 ? 'completed' : h === 8 ? 'in-transit' : h === 9 ? 'boarding' : 'scheduled',
      occupancy: h <= 7 ? Math.floor(Math.random() * 15) + 5 : h === 8 ? 12 : 0,
      capacity: 20
    });
  }

  console.log('Created shuttle routes & runs');

  // =====================
  // TALENT PROFILES
  // =====================

  await TalentProfile.create({
    user: actor1._id,
    preferredDriver: driver1._id,
    preferences: {
      vehicleType: 'SUV',
      temperature: 'Cool',
      music: 'No music',
      waterBrand: 'Fiji',
      snacks: ['Almonds', 'Protein bars', 'Green juice'],
      otherNotes: 'Prefers quiet rides. No phone calls from driver.'
    },
    confidential: true,
    hotelAddress: 'The Beverly Hilton, 9876 Wilshire Blvd, Beverly Hills, CA 90210',
    agentName: 'Robert Shaw',
    agentPhone: '+1 (310) 555-9000',
    costTracking: { totalTrips: 24, totalCost: 2150, totalMiles: 680 },
    currentStatus: 'traveling'
  });

  await TalentProfile.create({
    user: actor2._id,
    preferredDriver: driver2._id,
    preferences: {
      vehicleType: 'Sedan',
      temperature: 'Warm',
      music: 'Classical',
      waterBrand: 'Evian',
      snacks: ['Dark chocolate', 'Mixed berries'],
      otherNotes: 'Allergic to strong fragrances. No air fresheners.'
    },
    confidential: true,
    hotelAddress: 'Chateau Marmont, 8221 Sunset Blvd, West Hollywood, CA 90046',
    agentName: 'Patricia Wells',
    agentPhone: '+1 (310) 555-9001',
    costTracking: { totalTrips: 18, totalCost: 1680, totalMiles: 520 },
    currentStatus: 'at-hotel'
  });

  await TalentProfile.create({
    user: actor3._id,
    preferences: {
      vehicleType: 'SUV',
      temperature: 'Normal',
      music: 'Jazz',
      waterBrand: 'Smart Water',
      snacks: ['Trail mix'],
      otherNotes: 'Fine with conversation. Enjoys LA sightseeing routes.'
    },
    confidential: true,
    hotelAddress: 'Four Seasons, 300 S Doheny Dr, Los Angeles, CA 90048',
    agentName: 'Mark Foster',
    agentPhone: '+1 (310) 555-9002',
    costTracking: { totalTrips: 12, totalCost: 980, totalMiles: 340 },
    currentStatus: 'at-hotel'
  });

  console.log('Created talent profiles');

  // =====================
  // MAINTENANCE
  // =====================

  await Maintenance.create({
    vehicle: car3._id,
    type: 'brake-check',
    title: 'Brake Pad Replacement',
    description: 'Front brake pads worn below minimum. Replacing all four pads and inspecting rotors.',
    status: 'in-progress',
    scheduledDate: new Date(),
    cost: 450,
    mileageAtService: 45600,
    performedBy: 'LA Auto Service Center',
    notes: 'Expected completion by end of day'
  });

  await Maintenance.create({
    vehicle: car1._id,
    type: 'tire-rotation',
    title: 'Tire Rotation & Alignment',
    description: 'Routine tire rotation and wheel alignment check.',
    status: 'scheduled',
    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    cost: 120,
    mileageAtService: 12450,
    nextServiceMileage: 17450,
    performedBy: 'Tesla Service Center'
  });

  await Maintenance.create({
    vehicle: van1._id,
    type: 'oil-change',
    title: 'Oil Change + Filter',
    description: 'Standard oil change and filter replacement.',
    status: 'completed',
    scheduledDate: daysAgo(10),
    completedDate: daysAgo(10),
    cost: 95,
    mileageAtService: 67500,
    nextServiceMileage: 72500,
    nextServiceDate: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
    performedBy: 'Jiffy Lube, Burbank'
  });

  await Maintenance.create({
    vehicle: minibus._id,
    type: 'inspection',
    title: 'Annual Safety Inspection',
    description: 'DOT annual safety inspection required for passenger transport vehicles.',
    status: 'scheduled',
    scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    cost: 250,
    performedBy: 'CA Vehicle Inspection Station'
  });

  await Maintenance.create({
    vehicle: car2._id,
    type: 'cleaning',
    title: 'Full Detail & Interior Clean',
    description: 'VIP vehicle deep clean - interior shampoo, exterior polish, leather conditioning.',
    status: 'completed',
    scheduledDate: daysAgo(3),
    completedDate: daysAgo(3),
    cost: 180,
    performedBy: 'Premium Auto Detail, Beverly Hills'
  });

  console.log('Created maintenance records');

  // =====================
  // PERMANENT TRIPS
  // =====================
  const PermanentTrip = (await import('./models/PermanentTrip.js')).default;
  await PermanentTrip.deleteMany({});

  const todayPA = new Date();
  const nextMonth = new Date(todayPA);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  // Active: Mike drives Chris Evans daily
  const pt1 = await PermanentTrip.create({
    title: 'Chris Evans — Daily Hotel to Set',
    pickupLocation: 'The Beverly Hilton, Beverly Hills',
    dropoffLocation: 'Warner Bros Studio, Burbank',
    scheduledTime: '06:30',
    driver: driver1._id,
    vehicle: car1._id,
    passengers: [{
      name: 'Chris Evans',
      contactNumber: '+1-310-555-0101',
      pickupLocation: 'The Beverly Hilton Lobby',
      dropoffLocation: 'Stage 8 Entrance'
    }],
    startDate: daysAgo(5),
    endDate: nextMonth,
    activeDays: [1, 2, 3, 4, 5],
    status: 'active',
    isDriverAssigned: true,
    isVehicleAssigned: true,
    isFullDayTrip: false,
    isSelfManaged: false,
    createdBy: coordinator._id,
    notes: 'Talent pickup — must be on time'
  });
  await User.findByIdAndUpdate(driver1._id, { permanentTrip: pt1._id, isTripAssigned: true });

  // Active: Jane drives Emma Stone (full day, self-managed)
  const pt2 = await PermanentTrip.create({
    title: 'Emma Stone — Full Day Transport',
    pickupLocation: 'Four Seasons, Los Angeles',
    dropoffLocation: 'Paramount Studios, Melrose Ave',
    scheduledTime: '07:00',
    driver: driver2._id,
    vehicle: suv1._id,
    passengers: [{
      name: 'Emma Stone',
      pickupName: 'Ms. Stone',
      contactNumber: '+1-310-555-0202',
      isPrivate: true,
      pickupLocation: 'Four Seasons Valet',
      dropoffLocation: 'Paramount Main Gate'
    }],
    startDate: daysAgo(3),
    endDate: null, // indefinite
    activeDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
    status: 'active',
    isDriverAssigned: true,
    isVehicleAssigned: true,
    isFullDayTrip: true,
    isSelfManaged: true,
    createdBy: coordinator._id,
    notes: 'VIP talent — full day availability, driver manages route'
  });
  await User.findByIdAndUpdate(driver2._id, { permanentTrip: pt2._id, isTripAssigned: true });

  // Draft: Pending assignment for new talent
  await PermanentTrip.create({
    title: 'New Talent — TBD Assignment',
    pickupLocation: 'Chateau Marmont, West Hollywood',
    dropoffLocation: 'El Matador Beach, Malibu',
    scheduledTime: '08:00',
    passengers: [{
      name: 'Robert Downey Jr.',
      contactNumber: '+1-310-555-0303',
      pickupLocation: 'Chateau Marmont Entrance'
    }],
    startDate: new Date(todayPA.getTime() + 3 * 24 * 60 * 60 * 1000), // starts in 3 days
    endDate: nextMonth,
    activeDays: [1, 2, 3, 4, 5],
    status: 'draft',
    isDriverAssigned: false,
    isVehicleAssigned: false,
    createdBy: coordinator._id,
    notes: 'Needs driver and vehicle assignment before shoot starts'
  });

  // Paused: Temporarily on hold
  await PermanentTrip.create({
    title: 'Stunt Team — Location B',
    pickupLocation: 'Base Camp, Stage 12',
    dropoffLocation: '6th Street Bridge, Downtown LA',
    scheduledTime: '05:00',
    driver: driver3._id,
    vehicle: van1._id,
    passengers: [
      { name: 'Stunt Coordinator', contactNumber: '+1-310-555-0404', pickupLocation: 'Base Camp Gate A' },
      { name: 'Lead Stunt Double', contactNumber: '+1-310-555-0405', pickupLocation: 'Base Camp Gate A' }
    ],
    startDate: daysAgo(10),
    endDate: nextMonth,
    activeDays: [1, 2, 3, 4, 5],
    status: 'paused',
    isDriverAssigned: true,
    isVehicleAssigned: true,
    isFullDayTrip: false,
    createdBy: coordinator._id,
    notes: 'Paused — location B shoot postponed to next week',
    swapHistory: [{
      type: 'driver',
      previousId: driver1._id,
      newId: driver3._id,
      reason: 'Mike reassigned to talent duty',
      swappedBy: coordinator._id
    }]
  });

  console.log('Created permanent trips');

  // =====================
  // TRIP TEMPLATES
  // =====================
  const TripTemplate = (await import('./models/TripTemplate.js')).default;
  await TripTemplate.deleteMany({});

  await TripTemplate.create({
    name: 'Daily Crew Shuttle — Hotel to Set',
    title: 'Crew Shuttle → Film Set',
    type: 'recurring',
    passengers: [
      { name: 'Camera Dept', pickupAddress: 'Crew Hotel, West Hollywood', pickupTime: '06:00', dropoffAddress: 'Stage 8 - Main Set' },
      { name: 'Sound Dept', pickupAddress: 'Crew Hotel, West Hollywood', pickupTime: '06:00', dropoffAddress: 'Stage 8 - Main Set' },
      { name: 'Grip Team', pickupAddress: 'Equipment Rental, Cahuenga Blvd', pickupTime: '06:20', dropoffAddress: 'Stage 8 - Main Set' }
    ],
    preferredDriver: driver3._id,
    preferredVehicle: van1._id,
    notes: 'Daily morning crew shuttle. Stop at Coffee Bean on Sunset if time allows.',
    recurringDays: [1, 2, 3, 4, 5],
    estimatedDuration: 45,
    createdBy: coordinator._id,
    usageCount: 12
  });

  await TripTemplate.create({
    name: 'Chris Evans — Hotel to Set',
    title: 'Chris Evans → Film Set',
    type: 'one-time',
    passengers: [
      { user: actor1._id, name: 'Chris Evans', phone: '+1 (310) 555-0301', pickupAddress: 'The Beverly Hilton, Beverly Hills', pickupTime: '07:00', dropoffAddress: 'Warner Bros Studio, Burbank' }
    ],
    preferredDriver: driver1._id,
    preferredVehicle: car1._id,
    notes: 'VIP — ensure car is at 72°F, sparkling water stocked.',
    estimatedDuration: 35,
    createdBy: coordinator._id,
    usageCount: 8
  });

  await TripTemplate.create({
    name: 'Wrap Day — Set to Hotels',
    title: 'End of Day Wrap Transport',
    type: 'one-time',
    passengers: [
      { name: 'Talent Group', pickupAddress: 'Stage 8 - Main Set', pickupTime: '19:00', dropoffAddress: 'The Beverly Hilton, Beverly Hills' },
      { name: 'Director', pickupAddress: 'Stage 8 - Main Set', pickupTime: '19:30', dropoffAddress: 'Chateau Marmont, West Hollywood' },
      { name: 'Crew Lead', pickupAddress: 'Base Camp, Stage 12', pickupTime: '20:00', dropoffAddress: 'Crew Hotel, West Hollywood' }
    ],
    notes: 'Multiple stops for end-of-day wrap. Talent first priority.',
    estimatedDuration: 60,
    createdBy: coordinator._id,
    usageCount: 5
  });

  console.log('Created trip templates');

  // =====================
  // RATINGS
  // =====================

  try { await Rating.create({
    trip: trip6._id,
    ratedBy: actor1._id,
    ratedUser: driver1._id,
    rating: 5,
    comment: 'Mike is always on time and very professional. Best driver!',
    type: 'passenger-to-driver'
  }); } catch(e) { /* skip duplicate */ }

  try { await Rating.create({
    trip: trip5._id,
    ratedBy: coordinator._id,
    ratedUser: driver3._id,
    rating: 4,
    comment: 'Good job handling the early morning shuttle. Punctual.',
    type: 'coordinator-to-driver'
  }); } catch(e) { /* skip duplicate */ }

  console.log('Created ratings');

  // =====================
  // SUMMARY
  // =====================

  console.log('\n========================================');
  console.log('   DEMO DATA SEEDED SUCCESSFULLY!');
  console.log('========================================\n');
  console.log('DEMO ACCOUNTS:');
  console.log('  Coordinator:  coordinator@test.com / password123');
  console.log('  Driver:       driver1@test.com / password123');
  console.log('  Actor:        actor1@test.com / password123');
  console.log('\nOTHER ACCOUNTS:');
  console.log('  Coordinator2: coordinator2@test.com / password123');
  console.log('  Driver 2:     driver2@test.com / password123');
  console.log('  Driver 3:     driver3@test.com / password123');
  console.log('  Driver 4:     driver4@test.com / password123');
  console.log('  Actor 2:      actor2@test.com / password123');
  console.log('  Actor 3:      actor3@test.com / password123');
  console.log('  Crew:         crew1@test.com / password123');
  console.log('\nDATA CREATED:');
  console.log('  6 vehicles (1 in maintenance, 2 in use, 3 available)');
  console.log('  6 trips (1 driver-departed, 2 assigned, 1 unassigned, 2 completed)');
  console.log('  10 ride requests (2 pending, 1 approved, 1 assigned, 1 in-progress, 3 completed, 1 rejected)');
  console.log('  2 shuttle routes with runs');
  console.log('  3 talent profiles with preferences');
  console.log('  5 maintenance records');
  console.log('  9 notifications across users');
  console.log('  2 ratings\n');

  await mongoose.disconnect();
}

seed().catch(console.error);

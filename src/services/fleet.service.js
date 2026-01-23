const prisma = require('../utils/prisma');

/**
 * Fleet Service
 * Provides real-time fleet status for admin dashboard
 */

/**
 * Get real-time fleet status
 * Returns all active vehicles with:
 * - Driver info
 * - Latest GPS location
 * - Current orders (in_progress)
 */
const getStatus = async () => {
  // Get all active shifts with related data
  const activeShifts = await prisma.shift.findMany({
    where: { status: 'active' },
    include: {
      driver: true,
      vehicleAllocation: {
        include: { vehicle: true },
      },
    },
  });

  // For each active shift, get latest GPS and current orders
  const fleetStatus = await Promise.all(
    activeShifts.map(async (shift) => {
      const vehicle = shift.vehicleAllocation?.vehicle;
      if (!vehicle) return null;

      // Get latest GPS
      const latestGps = await prisma.gpsLocation.findFirst({
        where: { vehicleId: vehicle.id },
        orderBy: { recordedAt: 'desc' },
      });

      // Get current orders for this driver today
      const currentOrders = await prisma.order.findMany({
        where: {
          assignedDriverId: shift.driverId,
          assignedDate: shift.shiftDate,
          status: { in: ['assigned', 'in_progress'] },
        },
        include: {
          destination: true,
          product: true,
        },
      });

      return {
        vehicle: {
          id: vehicle.id,
          registrationNumber: vehicle.registrationNumber,
          capacityGallons: vehicle.capacityGallons,
        },
        driver: {
          id: shift.driver.id,
          name: shift.driver.name,
          phone: shift.driver.phone,
        },
        shift: {
          id: shift.id,
          startTime: shift.startTime,
          status: shift.status,
        },
        location: latestGps
          ? {
            latitude: latestGps.latitude,
            longitude: latestGps.longitude,
            recordedAt: latestGps.recordedAt,
          }
          : null,
        currentOrders: currentOrders.map((order) => ({
          id: order.id,
          destination: order.destination.name,
          product: order.product.name,
          quantity: order.quantity,
          status: order.status,
        })),
      };
    })
  );

  return fleetStatus.filter(Boolean);
};

/**
 * Get fleet summary statistics
 */
const getSummary = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalVehicles,
    totalDrivers,
    activeShifts,
    todayOrders,
    completedToday,
    inProgressOrders,
  ] = await Promise.all([
    prisma.vehicle.count(),
    prisma.driver.count(),
    prisma.shift.count({ where: { status: 'active' } }),
    prisma.order.count({ where: { assignedDate: today } }),
    prisma.order.count({ where: { assignedDate: today, status: 'completed' } }),
    prisma.order.count({ where: { status: 'in_progress' } }),
  ]);

  return {
    totalVehicles,
    totalDrivers,
    activeShifts,
    todayOrders,
    completedToday,
    inProgressOrders,
    vehicleUtilization: totalVehicles > 0
      ? Math.round((activeShifts / totalVehicles) * 100)
      : 0,
  };
};

module.exports = {
  getStatus,
  getSummary,
};

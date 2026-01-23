'use strict';

const prisma = require('../utils/prisma');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const shiftService = require('./shift.service');

/**
 * GPS Service
 * Handles GPS location ingestion and retrieval
 * Rejects updates when driver has no active shift
 */

/**
 * Record GPS location
 * Requires: driver must have active shift to record location
 */
const create = async ({ vehicleId, latitude, longitude, recordedAt }) => {
  vehicleId = parseInt(vehicleId);
  // Verify vehicle exists
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    throw new NotFoundError(`Vehicle with ID ${vehicleId} not found`);
  }

  // Find active shift for this vehicle
  const activeShift = await prisma.shift.findFirst({
    where: {
      status: 'active',
      vehicleAllocation: {
        vehicleId,
      },
    },
  });

  if (!activeShift) {
    throw new BadRequestError(
      `Cannot record GPS: vehicle '${vehicle.registrationNumber}' does not have an active shift`
    );
  }

  return prisma.gpsLocation.create({
    data: {
      vehicleId,
      shiftId: activeShift.id,
      latitude,
      longitude,
      recordedAt: recordedAt || new Date(),
    },
    include: {
      vehicle: true,
      shift: {
        include: { driver: true },
      },
    },
  });
};

/**
 * Get GPS history for a vehicle
 */
const getByVehicle = async (vehicleId, { from, to }) => {
  vehicleId = parseInt(vehicleId, 10);
  // Verify vehicle exists
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    throw new NotFoundError(`Vehicle with ID ${vehicleId} not found`);
  }

  const where = { vehicleId };

  if (from || to) {
    where.recordedAt = {};
    if (from) where.recordedAt.gte = new Date(from);
    if (to) where.recordedAt.lte = new Date(to);
  }

  return prisma.gpsLocation.findMany({
    where,
    orderBy: { recordedAt: 'desc' },
    include: {
      shift: {
        include: { driver: true },
      },
    },
  });
};

/**
 * Get GPS history for a driver
 * Returns all GPS updates from this driver's shifts
 */
const getByDriver = async (driverId, { from, to }) => {
  driverId = parseInt(driverId, 10);
  // Verify driver exists
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) {
    throw new NotFoundError(`Driver with ID ${driverId} not found`);
  }

  // Get all shift IDs for this driver
  const shifts = await prisma.shift.findMany({
    where: { driverId },
    select: { id: true },
  });

  const shiftIds = shifts.map((s) => s.id);

  if (shiftIds.length === 0) {
    return [];
  }

  const where = { shiftId: { in: shiftIds } };

  if (from || to) {
    where.recordedAt = {};
    if (from) where.recordedAt.gte = new Date(from);
    if (to) where.recordedAt.lte = new Date(to);
  }

  return prisma.gpsLocation.findMany({
    where,
    orderBy: { recordedAt: 'desc' },
    include: {
      vehicle: true,
      shift: true,
    },
  });
};

/**
 * Get latest GPS location for each active vehicle
 */
const getLatestForActiveVehicles = async () => {
  // Get all vehicles with active shifts
  const activeShifts = await prisma.shift.findMany({
    where: { status: 'active' },
    include: {
      vehicleAllocation: {
        include: { vehicle: true },
      },
    },
  });

  const vehicleIds = activeShifts
    .filter((s) => s.vehicleAllocation)
    .map((s) => s.vehicleAllocation.vehicleId);

  if (vehicleIds.length === 0) {
    return [];
  }

  // Get latest GPS for each vehicle
  const latestLocations = await Promise.all(
    vehicleIds.map(async (vehicleId) => {
      return prisma.gpsLocation.findFirst({
        where: { vehicleId },
        orderBy: { recordedAt: 'desc' },
        include: {
          vehicle: true,
          shift: {
            include: { driver: true },
          },
        },
      });
    })
  );

  return latestLocations.filter(Boolean);
};

module.exports = {
  create,
  getByVehicle,
  getByDriver,
  getLatestForActiveVehicles,
};

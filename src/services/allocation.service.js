'use strict';

const prisma = require('../utils/prisma');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');

/**
 * Allocation Service
 * Handles vehicle-to-driver allocation for specific days
 * Enforces: one vehicle can only be allocated to one driver per day
 */

const getAll = async (date = null) => {
  const where = {};
  if (date) {
    where.allocationDate = new Date(date);
  }

  return prisma.vehicleAllocation.findMany({
    where,
    include: {
      vehicle: true,
      driver: true,
    },
    orderBy: { allocationDate: 'desc' },
  });
};

const getById = async (id) => {
  const allocation = await prisma.vehicleAllocation.findUnique({
    where: { id },
    include: {
      vehicle: true,
      driver: true,
    },
  });

  if (!allocation) {
    throw new NotFoundError(`Allocation with ID ${id} not found`);
  }

  return allocation;
};

const create = async ({ vehicleId, driverId, allocationDate }) => {
  vehicleId = parseInt(vehicleId, 10);
  driverId = parseInt(driverId, 10);
  // Verify vehicle and driver exist
  const [vehicle, driver] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id: vehicleId } }),
    prisma.driver.findUnique({ where: { id: driverId } }),
  ]);

  if (!vehicle) {
    throw new NotFoundError(`Vehicle with ID ${vehicleId} not found`);
  }
  if (!driver) {
    throw new NotFoundError(`Driver with ID ${driverId} not found`);
  }

  // Format date to remove time component
  const date = new Date(allocationDate);
  date.setHours(0, 0, 0, 0);

  try {
    return await prisma.vehicleAllocation.create({
      data: {
        vehicleId,
        driverId,
        allocationDate: date,
        version: 0,
      },
      include: {
        vehicle: true,
        driver: true,
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      // Check which constraint was violated
      const target = error.meta?.target || [];
      if (target.includes('vehicleId')) {
        throw new ConflictError(
          `Vehicle '${vehicle.registrationNumber}' is already allocated for ${date.toISOString().split('T')[0]}`
        );
      }
      if (target.includes('driverId')) {
        throw new ConflictError(
          `Driver '${driver.name}' already has a vehicle allocated for ${date.toISOString().split('T')[0]}`
        );
      }
      throw new ConflictError('Allocation conflict: vehicle or driver already allocated for this date');
    }
    throw error;
  }
};

/**
 * Update allocation with optimistic locking
 * Requires version field in request body
 */
const update = async (id, data) => {
  await getById(id);

  // Version is required for updates (optimistic locking)
  if (data.version === undefined || data.version === null) {
    throw new BadRequestError('Version field is required for updates. Fetch the current record first.');
  }

  const expectedVersion = parseInt(data.version, 10);

  // Check if there's an active shift using this allocation
  const activeShift = await prisma.shift.findFirst({
    where: {
      vehicleAllocationId: id,
      status: 'active',
    },
  });

  if (activeShift) {
    throw new ConflictError('Cannot update allocation: there is an active shift using it');
  }

  // Prepare update data (remove version from data, we handle it separately)
  const { version, ...updateData } = data;

  // If updating date, format it
  if (updateData.allocationDate) {
    const date = new Date(updateData.allocationDate);
    date.setHours(0, 0, 0, 0);
    updateData.allocationDate = date;
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // Optimistic lock: update only if version matches
      const updated = await tx.vehicleAllocation.updateMany({
        where: {
          id,
          version: expectedVersion,
        },
        data: {
          ...updateData,
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        // Check if record exists but version changed
        const current = await tx.vehicleAllocation.findUnique({ where: { id } });
        if (current && current.version !== expectedVersion) {
          throw new ConflictError(
            `Allocation was modified by another user. ` +
            `Expected version ${expectedVersion}, current version is ${current.version}. ` +
            `Please refresh and try again.`
          );
        }
        throw new NotFoundError(`Allocation with ID ${id} not found`);
      }

      // Return the updated record with relations
      return tx.vehicleAllocation.findUnique({
        where: { id },
        include: {
          vehicle: true,
          driver: true,
        },
      });
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ConflictError('Vehicle or driver is already allocated for this date');
    }
    throw error;
  }
};

const remove = async (id) => {
  await getById(id);

  // Check if there are shifts using this allocation
  const shiftCount = await prisma.shift.count({
    where: { vehicleAllocationId: id },
  });

  if (shiftCount > 0) {
    throw new ConflictError(
      `Cannot delete allocation: it has ${shiftCount} shift(s) associated`
    );
  }

  await prisma.vehicleAllocation.delete({ where: { id } });
};

/**
 * Get available vehicles for a specific date
 * Returns vehicles that are NOT allocated on that date
 */
const getAvailableVehicles = async (date) => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  // Get all allocated vehicle IDs for this date
  const allocatedVehicleIds = await prisma.vehicleAllocation.findMany({
    where: { allocationDate: targetDate },
    select: { vehicleId: true },
  });

  const allocatedIds = allocatedVehicleIds.map((a) => a.vehicleId);

  // Return vehicles not in the allocated list
  return prisma.vehicle.findMany({
    where: {
      id: { notIn: allocatedIds },
    },
    orderBy: { id: 'asc' },
  });
};

/**
 * Get allocation for a driver on a specific date
 */
const getByDriverAndDate = async (driverId, date) => {
  driverId = parseInt(driverId, 10);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  return prisma.vehicleAllocation.findFirst({
    where: {
      driverId,
      allocationDate: targetDate,
    },
    include: {
      vehicle: true,
      driver: true,
    },
  });
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getAvailableVehicles,
  getByDriverAndDate,
};

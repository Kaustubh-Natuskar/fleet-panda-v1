const prisma = require('../utils/prisma');
const { NotFoundError, ConflictError } = require('../utils/errors');

/**
 * Driver Service
 * Handles all business logic for driver operations
 */

const getAll = async () => {
  return prisma.driver.findMany({
    orderBy: { name: 'asc' },
  });
};

const getById = async (id) => {
  const driver = await prisma.driver.findUnique({
    where: { id },
  });

  if (!driver) {
    throw new NotFoundError(`Driver with ID ${id} not found`);
  }

  return driver;
};

const create = async (data) => {
  try {
    return await prisma.driver.create({ data });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ConflictError(`Driver with email '${data.email}' already exists`);
    }
    throw error;
  }
};

const update = async (id, data) => {
  await getById(id);

  try {
    return await prisma.driver.update({
      where: { id },
      data,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ConflictError(`Driver with license number '${data.licenseNumber}' already exists`);
    }
    throw error;
  }
};

const remove = async (id) => {
  await getById(id);

  // Check if driver has allocations or orders
  const [allocationCount, orderCount] = await Promise.all([
    prisma.vehicleAllocation.count({ where: { driverId: id } }),
    prisma.order.count({ where: { assignedDriverId: id } }),
  ]);

  if (allocationCount > 0 || orderCount > 0) {
    throw new ConflictError(
      `Cannot delete driver: has ${allocationCount} allocations and ${orderCount} orders`
    );
  }

  await prisma.driver.delete({ where: { id } });
};

/**
 * Get all shifts for a driver with vehicle and order details
 */
const getShifts = async (driverId, status = null) => {
  driverId = parseInt(driverId);
  await getById(driverId);

  const where = { driverId };
  if (status) {
    where.status = status;
  }

  const shifts = await prisma.shift.findMany({
    where,
    include: {
      vehicleAllocation: {
        include: {
          vehicle: true,
        },
      },
      orderAttempts: {
        include: {
          order: {
            include: {
              destination: true,
              product: true,
            },
          },
        },
      },
    },
    orderBy: { shiftDate: 'desc' },
  });

  // Format the response to be driver-friendly
  return shifts.map((shift) => ({
    id: shift.id,
    shiftDate: shift.shiftDate,
    status: shift.status,
    startTime: shift.startTime,
    endTime: shift.endTime,
    vehicle: shift.vehicleAllocation?.vehicle || null,
    orders: shift.orderAttempts.map((attempt) => ({
      id: attempt.order.id,
      destination: {
        id: attempt.order.destination.id,
        name: attempt.order.destination.name,
        type: attempt.order.destination.type,
        address: attempt.order.destination.address,
      },
      product: {
        id: attempt.order.product.id,
        name: attempt.order.product.name,
      },
      quantity: attempt.order.quantity,
      status: attempt.status,
      failureReason: attempt.failureReason,
      completedAt: attempt.completedAt,
    })),
  }));
};

/**
 * Get orders assigned to a driver
 */
const getOrders = async (driverId, status = null) => {
  driverId = parseInt(driverId, 10);
  await getById(driverId);

  const where = { assignedDriverId: driverId };
  if (status) {
    where.status = status;
  }

  return prisma.order.findMany({
    where,
    include: {
      destination: true,
      product: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getShifts,
  getOrders,
};

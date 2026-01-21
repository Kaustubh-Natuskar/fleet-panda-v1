const prisma = require('../utils/prisma');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');
const allocationService = require('./allocation.service');

/**
 * Shift Service
 * Handles driver shift scheduling, starting, and ending
 */

const getAll = async (status = null) => {
  const where = {};
  if (status) {
    where.status = status;
  }

  return prisma.shift.findMany({
    where,
    include: {
      driver: true,
      vehicleAllocation: {
        include: { vehicle: true },
      },
    },
    orderBy: { shiftDate: 'desc' },
  });
};

const getById = async (id) => {
  const shift = await prisma.shift.findUnique({
    where: { id },
    include: {
      driver: true,
      vehicleAllocation: {
        include: { vehicle: true },
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
  });

  if (!shift) {
    throw new NotFoundError(`Shift with ID ${id} not found`);
  }

  return shift;
};

/**
 * Schedule a future shift (driver declares availability)
 * Does NOT require allocation - that comes later from admin
 */
const schedule = async ({ driverId, shiftDate }) => {
  // Verify driver exists
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) {
    throw new NotFoundError(`Driver with ID ${driverId} not found`);
  }

  // Format date
  const date = new Date(shiftDate);
  date.setHours(0, 0, 0, 0);

  // Check if driver already has a shift for this date
  const existingShift = await prisma.shift.findUnique({
    where: {
      driverId_shiftDate: { driverId, shiftDate: date },
    },
  });

  if (existingShift) {
    throw new ConflictError(
      `Driver already has a shift scheduled for ${date.toISOString().split('T')[0]}`
    );
  }

  return prisma.shift.create({
    data: {
      driverId,
      shiftDate: date,
      status: 'scheduled',
    },
    include: {
      driver: true,
    },
  });
};

/**
 * Start a shift
 * Requires: allocation exists for driver + today
 * If pre-scheduled shift exists: activate it
 * If no shift exists: create ad-hoc shift
 */
const start = async ({ driverId }) => {
  // Verify driver exists
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) {
    throw new NotFoundError(`Driver with ID ${driverId} not found`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check for existing active shift
  const activeShift = await prisma.shift.findFirst({
    where: {
      driverId,
      status: 'active',
    },
  });

  if (activeShift) {
    throw new ConflictError('Driver already has an active shift');
  }

  // Check for allocation today
  const allocation = await allocationService.getByDriverAndDate(driverId, today);
  if (!allocation) {
    throw new BadRequestError(
      `No vehicle allocated for driver ${driver.name} today. Cannot start shift.`
    );
  }

  // Check if there's a pre-scheduled shift for today
  const scheduledShift = await prisma.shift.findUnique({
    where: {
      driverId_shiftDate: { driverId, shiftDate: today },
    },
  });

  if (scheduledShift) {
    // Activate the pre-scheduled shift
    return prisma.shift.update({
      where: { id: scheduledShift.id },
      data: {
        status: 'active',
        startTime: new Date(),
        vehicleAllocationId: allocation.id,
      },
      include: {
        driver: true,
        vehicleAllocation: {
          include: { vehicle: true },
        },
      },
    });
  } else {
    // Create ad-hoc shift
    return prisma.shift.create({
      data: {
        driverId,
        shiftDate: today,
        status: 'active',
        startTime: new Date(),
        vehicleAllocationId: allocation.id,
      },
      include: {
        driver: true,
        vehicleAllocation: {
          include: { vehicle: true },
        },
      },
    });
  }
};

/**
 * End a shift
 * Requires: all orders must be completed or failed
 */
const end = async (id, driverId) => {
  const shift = await getById(id);

  // Verify driver owns this shift
  if (shift.driverId !== driverId) {
    throw new BadRequestError('This shift belongs to a different driver');
  }

  // Check shift is active
  if (shift.status !== 'active') {
    throw new BadRequestError(`Cannot end shift: status is '${shift.status}', not 'active'`);
  }

  // Check for incomplete orders
  const incompleteOrders = await prisma.order.findMany({
    where: {
      assignedDriverId: driverId,
      assignedDate: shift.shiftDate,
      status: { in: ['assigned', 'in_progress'] },
    },
  });

  if (incompleteOrders.length > 0) {
    const orderIds = incompleteOrders.map((o) => o.id).join(', ');
    throw new BadRequestError(
      `Cannot end shift: ${incompleteOrders.length} incomplete order(s) (IDs: ${orderIds}). Mark them as completed or failed first.`
    );
  }

  return prisma.shift.update({
    where: { id },
    data: {
      status: 'completed',
      endTime: new Date(),
    },
    include: {
      driver: true,
      vehicleAllocation: {
        include: { vehicle: true },
      },
    },
  });
};

/**
 * Get active shift for a driver
 */
const getActiveShiftForDriver = async (driverId) => {
  return prisma.shift.findFirst({
    where: {
      driverId,
      status: 'active',
    },
    include: {
      vehicleAllocation: {
        include: { vehicle: true },
      },
    },
  });
};

/**
 * Get shifts by driver
 */
const getByDriver = async (driverId, status = null) => {
  const where = { driverId };
  if (status) {
    where.status = status;
  }

  return prisma.shift.findMany({
    where,
    include: {
      vehicleAllocation: {
        include: { vehicle: true },
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
};

module.exports = {
  getAll,
  getById,
  schedule,
  start,
  end,
  getActiveShiftForDriver,
  getByDriver,
};

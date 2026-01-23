'use strict';

const prisma = require('../utils/prisma');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');
const shiftService = require('./shift.service');

/**
 * Order Service
 * Handles order lifecycle: create → assign → start → complete/fail
 */

const getAll = async (filters = {}) => {
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.driverId) {
    where.assignedDriverId = parseInt(filters.driverId);
  }
  if (filters.date) {
    where.assignedDate = new Date(filters.date);
  }

  return prisma.order.findMany({
    where,
    include: {
      destination: true,
      product: true,
      assignedDriver: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

const getById = async (id) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      destination: true,
      product: true,
      assignedDriver: true,
      attempts: {
        include: { shift: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!order) {
    throw new NotFoundError(`Order with ID ${id} not found`);
  }

  return order;
};

const create = async (data) => {
  // Verify destination and product exist
  const [destination, product] = await Promise.all([
    prisma.location.findUnique({ where: { id: data.destinationId } }),
    prisma.product.findUnique({ where: { id: data.productId } }),
  ]);

  if (!destination) {
    throw new NotFoundError(`Destination with ID ${data.destinationId} not found`);
  }
  if (!product) {
    throw new NotFoundError(`Product with ID ${data.productId} not found`);
  }

  // If driver assigned, verify they exist
  if (data.assignedDriverId) {
    data.assignedDriverId = parseInt(data.assignedDriverId, 10);
    const driver = await prisma.driver.findUnique({
      where: { id: data.assignedDriverId },
    });
    if (!driver) {
      throw new NotFoundError(`Driver with ID ${data.assignedDriverId} not found`);
    }
    // Set status to assigned and date to today if not provided
    data.status = 'assigned';
    if (!data.assignedDate) {
      data.assignedDate = new Date();
    }
  }

  return prisma.order.create({
    data,
    include: {
      destination: true,
      product: true,
      assignedDriver: true,
    },
  });
};

const update = async (id, data) => {
  await getById(id);

  return prisma.order.update({
    where: { id },
    data,
    include: {
      destination: true,
      product: true,
      assignedDriver: true,
    },
  });
};

const remove = async (id) => {
  const order = await getById(id);

  if (order.status !== 'pending') {
    throw new ConflictError(
      `Cannot delete order: status is '${order.status}'. Only pending orders can be deleted.`
    );
  }

  await prisma.order.delete({ where: { id } });
};

/**
 * Assign order to a driver
 */
const assign = async (id, { driverId, assignedDate }) => {
  driverId = parseInt(driverId);
  const order = await getById(id);

  if (order.status !== 'pending' && order.status !== 'assigned') {
    throw new ConflictError(
      `Cannot assign order: status is '${order.status}'. Only pending or assigned orders can be reassigned.`
    );
  }

  // Verify driver exists
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) {
    throw new NotFoundError(`Driver with ID ${driverId} not found`);
  }

  const date = assignedDate ? new Date(assignedDate) : new Date();
  date.setHours(0, 0, 0, 0);

  return prisma.order.update({
    where: { id },
    data: {
      assignedDriverId: driverId,
      assignedDate: date,
      status: 'assigned',
    },
    include: {
      destination: true,
      product: true,
      assignedDriver: true,
    },
  });
};

/**
 * Start an order (driver begins delivery)
 * Requires: active shift for driver
 */
const startOrder = async (id, driverId) => {
  driverId = parseInt(driverId, 10);
  const order = await getById(id);

  // Verify order is assigned to this driver
  if (order.assignedDriverId !== driverId) {
    throw new BadRequestError('This order is not assigned to you');
  }

  if (order.status !== 'assigned') {
    throw new ConflictError(
      `Cannot start order: status is '${order.status}'. Only assigned orders can be started.`
    );
  }

  // Check driver has active shift
  const activeShift = await shiftService.getActiveShiftForDriver(driverId);
  if (!activeShift) {
    throw new BadRequestError('Cannot start order: you do not have an active shift');
  }

  // Use transaction to update order and create attempt
  return prisma.$transaction(async (tx) => {
    // Update order status
    const updatedOrder = await tx.order.update({
      where: { id },
      data: { status: 'in_progress' },
      include: {
        destination: true,
        product: true,
        assignedDriver: true,
      },
    });

    // Create order attempt record
    await tx.orderAttempt.create({
      data: {
        orderId: id,
        shiftId: activeShift.id,
        status: 'in_progress',
      },
    });

    return updatedOrder;
  });
};

/**
 * Complete an order
 * - Updates order status to completed
 * - Updates attempt status
 * - Increases destination inventory (atomic transaction)
 */
const completeOrder = async (id, driverId) => {
  driverId = parseInt(driverId, 10);
  const order = await getById(id);

  // Verify order is assigned to this driver
  if (order.assignedDriverId !== driverId) {
    throw new BadRequestError('This order is not assigned to you');
  }

  if (order.status !== 'in_progress') {
    throw new ConflictError(
      `Cannot complete order: status is '${order.status}'. Only in_progress orders can be completed.`
    );
  }

  // Get active shift
  const activeShift = await shiftService.getActiveShiftForDriver(driverId);
  if (!activeShift) {
    throw new BadRequestError('Cannot complete order: you do not have an active shift');
  }

  // Find the in_progress attempt
  const attempt = await prisma.orderAttempt.findFirst({
    where: {
      orderId: id,
      shiftId: activeShift.id,
      status: 'in_progress',
    },
  });

  if (!attempt) {
    throw new BadRequestError('No active attempt found for this order');
  }

  // Transaction: update order, attempt, and inventory atomically
  return prisma.$transaction(async (tx) => {
    // Update order status
    const updatedOrder = await tx.order.update({
      where: { id },
      data: { status: 'completed' },
      include: {
        destination: true,
        product: true,
        assignedDriver: true,
      },
    });

    // Update attempt
    await tx.orderAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    // Increase destination inventory
    await tx.inventory.upsert({
      where: {
        locationId_productId: {
          locationId: order.destinationId,
          productId: order.productId,
        },
      },
      update: {
        quantity: { increment: order.quantity },
      },
      create: {
        locationId: order.destinationId,
        productId: order.productId,
        quantity: order.quantity,
      },
    });

    return updatedOrder;
  });
};

/**
 * Fail an order
 * - Updates order status to failed
 * - Records failure reason
 * - Does NOT update inventory
 */
const failOrder = async (id, driverId, reason) => {
  driverId = parseInt(driverId, 10);
  const order = await getById(id);

  // Verify order is assigned to this driver
  if (order.assignedDriverId !== driverId) {
    throw new BadRequestError('This order is not assigned to you');
  }

  if (order.status !== 'assigned' && order.status !== 'in_progress') {
    throw new ConflictError(
      `Cannot fail order: status is '${order.status}'. Only assigned or in_progress orders can be failed.`
    );
  }

  // Get active shift
  const activeShift = await shiftService.getActiveShiftForDriver(driverId);
  if (!activeShift) {
    throw new BadRequestError('Cannot fail order: you do not have an active shift');
  }

  // Find existing attempt or create one
  let attempt = await prisma.orderAttempt.findFirst({
    where: {
      orderId: id,
      shiftId: activeShift.id,
      status: 'in_progress',
    },
  });

  return prisma.$transaction(async (tx) => {
    // Update order status
    const updatedOrder = await tx.order.update({
      where: { id },
      data: { status: 'failed' },
      include: {
        destination: true,
        product: true,
        assignedDriver: true,
      },
    });

    if (attempt) {
      // Update existing attempt
      await tx.orderAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'failed',
          failureReason: reason,
          completedAt: new Date(),
        },
      });
    } else {
      // Create failed attempt record
      await tx.orderAttempt.create({
        data: {
          orderId: id,
          shiftId: activeShift.id,
          status: 'failed',
          failureReason: reason,
          completedAt: new Date(),
        },
      });
    }

    return updatedOrder;
  });
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  assign,
  startOrder,
  completeOrder,
  failOrder,
};

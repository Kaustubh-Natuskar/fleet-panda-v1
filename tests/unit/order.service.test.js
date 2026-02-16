'use strict';

/**
 * Unit Tests for Order Service
 * Tests critical business logic for order lifecycle
 * Including atomic race condition protection for start/complete/fail
 */

// Mock Prisma before importing services
jest.mock('../../src/utils/prisma', () => ({
  order: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  location: {
    findUnique: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
  },
  driver: {
    findUnique: jest.fn(),
  },
  shift: {
    findFirst: jest.fn(),
  },
  orderAttempt: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  inventory: {
    upsert: jest.fn(),
  },
  $transaction: jest.fn(),
}));

const prisma = require('../../src/utils/prisma');
const orderService = require('../../src/services/order.service');
const { BadRequestError, ConflictError, NotFoundError } = require('../../src/utils/errors');

describe('Order Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startOrder', () => {
    const mockOrder = {
      id: 1,
      status: 'assigned',
      assignedDriverId: 1,
      destinationId: 3,
      productId: 1,
      quantity: 5000,
    };

    const mockShift = { id: 10, driverId: 1, status: 'active' };

    it('should start order with atomic check-and-update', async () => {
      const completedOrder = { ...mockOrder, status: 'in_progress', destination: {}, product: {}, assignedDriver: {} };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.shift.findFirst.mockResolvedValue(mockShift);

      const mockTx = {
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUnique: jest.fn().mockResolvedValue(completedOrder),
        },
        orderAttempt: {
          create: jest.fn().mockResolvedValue({}),
        },
      };
      prisma.$transaction.mockImplementation((cb) => cb(mockTx));

      const result = await orderService.startOrder(1, 1);

      expect(result.status).toBe('in_progress');
      expect(mockTx.order.updateMany).toHaveBeenCalledWith({
        where: { id: 1, status: 'assigned', assignedDriverId: 1 },
        data: { status: 'in_progress' },
      });
      expect(mockTx.orderAttempt.create).toHaveBeenCalledWith({
        data: { orderId: 1, shiftId: 10, status: 'in_progress' },
      });
    });

    it('should reject with ConflictError if order already started (race condition)', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.shift.findFirst.mockResolvedValue(mockShift);

      const mockTx = {
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }), // Another request already changed it
        },
      };
      prisma.$transaction.mockImplementation((cb) => cb(mockTx));

      await expect(orderService.startOrder(1, 1)).rejects.toThrow(ConflictError);
    });

    it('should reject if order not assigned to driver', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...mockOrder, assignedDriverId: 2 });

      await expect(orderService.startOrder(1, 1)).rejects.toThrow(BadRequestError);
    });

    it('should reject if driver has no active shift', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.shift.findFirst.mockResolvedValue(null);

      await expect(orderService.startOrder(1, 1)).rejects.toThrow(BadRequestError);
    });
  });

  describe('completeOrder', () => {
    const mockOrder = {
      id: 1,
      destinationId: 3,
      productId: 1,
      quantity: 5000,
      status: 'in_progress',
      assignedDriverId: 1,
    };

    const mockShift = { id: 10, driverId: 1, status: 'active' };

    it('should complete order and update inventory atomically', async () => {
      const completedOrder = { ...mockOrder, status: 'completed', destination: {}, product: {}, assignedDriver: {} };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.shift.findFirst.mockResolvedValue(mockShift);

      const mockTx = {
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUnique: jest.fn().mockResolvedValue(completedOrder),
        },
        orderAttempt: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        inventory: {
          upsert: jest.fn().mockResolvedValue({ quantity: 5000 }),
        },
      };
      prisma.$transaction.mockImplementation((cb) => cb(mockTx));

      const result = await orderService.completeOrder(1, 1);

      expect(result.status).toBe('completed');
      // Verify atomic status check in WHERE clause
      expect(mockTx.order.updateMany).toHaveBeenCalledWith({
        where: { id: 1, status: 'in_progress', assignedDriverId: 1 },
        data: { status: 'completed' },
      });
      // Verify inventory was incremented
      expect(mockTx.inventory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { quantity: { increment: 5000 } },
        })
      );
    });

    it('should reject with ConflictError if order already completed (race condition)', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.shift.findFirst.mockResolvedValue(mockShift);

      const mockTx = {
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      };
      prisma.$transaction.mockImplementation((cb) => cb(mockTx));

      await expect(orderService.completeOrder(1, 1)).rejects.toThrow(ConflictError);
    });

    it('should not increment inventory when race condition occurs', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.shift.findFirst.mockResolvedValue(mockShift);

      const mockTx = {
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        inventory: {
          upsert: jest.fn(),
        },
      };
      prisma.$transaction.mockImplementation((cb) => cb(mockTx));

      await expect(orderService.completeOrder(1, 1)).rejects.toThrow(ConflictError);
      // Inventory must NOT be called if updateMany returned count 0
      expect(mockTx.inventory.upsert).not.toHaveBeenCalled();
    });

    it('should reject if order not assigned to driver', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...mockOrder, assignedDriverId: 2 });

      await expect(orderService.completeOrder(1, 1)).rejects.toThrow(BadRequestError);
    });

    it('should reject if driver has no active shift', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.shift.findFirst.mockResolvedValue(null);

      await expect(orderService.completeOrder(1, 1)).rejects.toThrow(BadRequestError);
    });
  });

  describe('failOrder', () => {
    const mockOrder = {
      id: 1,
      destinationId: 3,
      productId: 1,
      quantity: 5000,
      status: 'in_progress',
      assignedDriverId: 1,
    };

    const mockShift = { id: 10, driverId: 1, status: 'active' };

    it('should fail order without updating inventory', async () => {
      const failedOrder = { ...mockOrder, status: 'failed', destination: {}, product: {}, assignedDriver: {} };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.shift.findFirst.mockResolvedValue(mockShift);

      const mockTx = {
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUnique: jest.fn().mockResolvedValue(failedOrder),
        },
        orderAttempt: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        inventory: {
          upsert: jest.fn(),
        },
      };
      prisma.$transaction.mockImplementation((cb) => cb(mockTx));

      const result = await orderService.failOrder(1, 1, 'Pump malfunction');

      expect(result.status).toBe('failed');
      // Verify atomic status check allows both assigned and in_progress
      expect(mockTx.order.updateMany).toHaveBeenCalledWith({
        where: { id: 1, status: { in: ['assigned', 'in_progress'] }, assignedDriverId: 1 },
        data: { status: 'failed' },
      });
      // Inventory should NOT be updated for failed orders
      expect(mockTx.inventory.upsert).not.toHaveBeenCalled();
    });

    it('should create new attempt if no in_progress attempt exists', async () => {
      const failedOrder = { ...mockOrder, status: 'failed', destination: {}, product: {}, assignedDriver: {} };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.shift.findFirst.mockResolvedValue(mockShift);

      const mockTx = {
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUnique: jest.fn().mockResolvedValue(failedOrder),
        },
        orderAttempt: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }), // No existing attempt
          create: jest.fn().mockResolvedValue({}),
        },
      };
      prisma.$transaction.mockImplementation((cb) => cb(mockTx));

      await orderService.failOrder(1, 1, 'Customer refused');

      expect(mockTx.orderAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 1,
          shiftId: 10,
          status: 'failed',
          failureReason: 'Customer refused',
        }),
      });
    });

    it('should reject with ConflictError if order status already changed (race condition)', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.shift.findFirst.mockResolvedValue(mockShift);

      const mockTx = {
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      };
      prisma.$transaction.mockImplementation((cb) => cb(mockTx));

      await expect(orderService.failOrder(1, 1, 'reason')).rejects.toThrow(ConflictError);
    });

    it('should reject if order not assigned to driver', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...mockOrder, assignedDriverId: 2 });

      await expect(orderService.failOrder(1, 1, 'reason')).rejects.toThrow(BadRequestError);
    });

    it('should reject if driver has no active shift', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.shift.findFirst.mockResolvedValue(null);

      await expect(orderService.failOrder(1, 1, 'reason')).rejects.toThrow(BadRequestError);
    });
  });
});

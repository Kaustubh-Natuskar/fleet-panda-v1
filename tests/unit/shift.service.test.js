/**
 * Unit Tests for Shift Service
 * Tests critical business logic for shift lifecycle
 */

jest.mock('../../src/utils/prisma', () => ({
  driver: {
    findUnique: jest.fn(),
  },
  shift: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  vehicleAllocation: {
    findFirst: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
  },
}));

// Mock the allocation service
jest.mock('../../src/services/allocation.service', () => ({
  getByDriverAndDate: jest.fn(),
}));

const prisma = require('../../src/utils/prisma');
const allocationService = require('../../src/services/allocation.service');
const shiftService = require('../../src/services/shift.service');
const { BadRequestError, ConflictError, NotFoundError } = require('../../src/utils/errors');

describe('Shift Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('start', () => {
    it('should start shift when allocation exists', async () => {
      const mockDriver = { id: 1, name: 'John Smith' };
      const mockAllocation = {
        id: 1,
        vehicleId: 1,
        driverId: 1,
        vehicle: { id: 1, registrationNumber: 'TX-FP-001' },
      };
      const mockShift = {
        id: 1,
        driverId: 1,
        status: 'active',
        vehicleAllocationId: 1,
        driver: mockDriver,
        vehicleAllocation: mockAllocation,
      };

      prisma.driver.findUnique.mockResolvedValue(mockDriver);
      prisma.shift.findFirst.mockResolvedValue(null); // No active shift
      prisma.shift.findUnique.mockResolvedValue(null); // No pre-scheduled shift
      allocationService.getByDriverAndDate.mockResolvedValue(mockAllocation);
      prisma.shift.create.mockResolvedValue(mockShift);

      const result = await shiftService.start({ driverId: 1 });

      expect(result.status).toBe('active');
      expect(result.vehicleAllocationId).toBe(1);
    });

    it('should reject if no allocation exists for today', async () => {
      const mockDriver = { id: 1, name: 'John Smith' };

      prisma.driver.findUnique.mockResolvedValue(mockDriver);
      prisma.shift.findFirst.mockResolvedValue(null);
      allocationService.getByDriverAndDate.mockResolvedValue(null); // No allocation

      await expect(shiftService.start({ driverId: 1 })).rejects.toThrow(BadRequestError);
    });

    it('should reject if driver already has active shift', async () => {
      const mockDriver = { id: 1, name: 'John Smith' };
      const existingShift = { id: 1, driverId: 1, status: 'active' };

      prisma.driver.findUnique.mockResolvedValue(mockDriver);
      prisma.shift.findFirst.mockResolvedValue(existingShift); // Already active

      await expect(shiftService.start({ driverId: 1 })).rejects.toThrow(ConflictError);
    });

    it('should reject if driver not found', async () => {
      prisma.driver.findUnique.mockResolvedValue(null);

      await expect(shiftService.start({ driverId: 999 })).rejects.toThrow(NotFoundError);
    });
  });

  describe('end', () => {
    it('should end shift when no incomplete orders', async () => {
      const mockShift = {
        id: 1,
        driverId: 1,
        shiftDate: new Date(),
        status: 'active',
        driver: { id: 1, name: 'John Smith' },
        vehicleAllocation: { vehicle: { id: 1 } },
        orderAttempts: [],
      };

      prisma.shift.findUnique.mockResolvedValue(mockShift);
      prisma.order.findMany.mockResolvedValue([]); // No incomplete orders
      prisma.shift.update.mockResolvedValue({ ...mockShift, status: 'completed' });

      const result = await shiftService.end(1, 1);

      expect(result.status).toBe('completed');
    });

    it('should block shift end if incomplete orders exist', async () => {
      const mockShift = {
        id: 1,
        driverId: 1,
        shiftDate: new Date(),
        status: 'active',
        driver: { id: 1, name: 'John Smith' },
        vehicleAllocation: { vehicle: { id: 1 } },
        orderAttempts: [],
      };

      const incompleteOrders = [
        { id: 5, status: 'in_progress' },
        { id: 7, status: 'assigned' },
      ];

      prisma.shift.findUnique.mockResolvedValue(mockShift);
      prisma.order.findMany.mockResolvedValue(incompleteOrders);

      await expect(shiftService.end(1, 1)).rejects.toThrow(BadRequestError);
      await expect(shiftService.end(1, 1)).rejects.toThrow(/incomplete order/i);
    });

    it('should reject if shift not active', async () => {
      const mockShift = {
        id: 1,
        driverId: 1,
        status: 'completed', // Already completed
        driver: { id: 1 },
        vehicleAllocation: null,
        orderAttempts: [],
      };

      prisma.shift.findUnique.mockResolvedValue(mockShift);

      await expect(shiftService.end(1, 1)).rejects.toThrow(BadRequestError);
    });

    it('should reject if different driver tries to end shift', async () => {
      const mockShift = {
        id: 1,
        driverId: 1,
        status: 'active',
        driver: { id: 1 },
        vehicleAllocation: null,
        orderAttempts: [],
      };

      prisma.shift.findUnique.mockResolvedValue(mockShift);

      await expect(shiftService.end(1, 2)).rejects.toThrow(BadRequestError); // Driver 2 tries to end
    });
  });

  describe('schedule', () => {
    it('should schedule a future shift', async () => {
      const mockDriver = { id: 1, name: 'John Smith' };
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      prisma.driver.findUnique.mockResolvedValue(mockDriver);
      prisma.shift.findUnique.mockResolvedValue(null); // No existing shift
      prisma.shift.create.mockResolvedValue({
        id: 1,
        driverId: 1,
        shiftDate: futureDate,
        status: 'scheduled',
        driver: mockDriver,
      });

      const result = await shiftService.schedule({
        driverId: 1,
        shiftDate: futureDate.toISOString(),
      });

      expect(result.status).toBe('scheduled');
    });

    it('should reject if driver already has shift on date', async () => {
      const mockDriver = { id: 1, name: 'John Smith' };
      const existingShift = { id: 1, driverId: 1, status: 'scheduled' };

      prisma.driver.findUnique.mockResolvedValue(mockDriver);
      prisma.shift.findUnique.mockResolvedValue(existingShift); // Already exists

      await expect(
        shiftService.schedule({ driverId: 1, shiftDate: new Date().toISOString() })
      ).rejects.toThrow(ConflictError);
    });
  });
});

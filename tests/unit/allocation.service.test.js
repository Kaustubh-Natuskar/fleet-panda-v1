'use strict';

/**
 * Unit Tests for Allocation Service
 * Tests vehicle and driver allocation constraints
 */

jest.mock('../../src/utils/prisma', () => ({
  vehicle: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  driver: {
    findUnique: jest.fn(),
  },
  vehicleAllocation: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  shift: {
    findFirst: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
}));

const prisma = require('../../src/utils/prisma');
const allocationService = require('../../src/services/allocation.service');
const { ConflictError, NotFoundError, BadRequestError } = require('../../src/utils/errors');

describe('Allocation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create allocation successfully', async () => {
      const mockVehicle = { id: 1, registrationNumber: 'TX-FP-001' };
      const mockDriver = { id: 1, name: 'John Smith' };
      const mockAllocation = {
        id: 1,
        vehicleId: 1,
        driverId: 1,
        allocationDate: new Date('2026-01-25'),
        vehicle: mockVehicle,
        driver: mockDriver,
      };

      prisma.vehicle.findUnique.mockResolvedValue(mockVehicle);
      prisma.driver.findUnique.mockResolvedValue(mockDriver);
      prisma.vehicleAllocation.create.mockResolvedValue(mockAllocation);

      const result = await allocationService.create({
        vehicleId: 1,
        driverId: 1,
        allocationDate: '2026-01-25',
      });

      expect(result.vehicleId).toBe(1);
      expect(result.driverId).toBe(1);
    });

    it('should reject if vehicle already allocated on date', async () => {
      const mockVehicle = { id: 1, registrationNumber: 'TX-FP-001' };
      const mockDriver = { id: 1, name: 'John Smith' };

      prisma.vehicle.findUnique.mockResolvedValue(mockVehicle);
      prisma.driver.findUnique.mockResolvedValue(mockDriver);
      prisma.vehicleAllocation.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['vehicleId', 'allocationDate'] },
      });

      await expect(
        allocationService.create({
          vehicleId: 1,
          driverId: 1,
          allocationDate: '2026-01-25',
        })
      ).rejects.toThrow(ConflictError);
    });

    it('should reject if driver already has allocation on date', async () => {
      const mockVehicle = { id: 2, registrationNumber: 'TX-FP-002' };
      const mockDriver = { id: 1, name: 'John Smith' };

      prisma.vehicle.findUnique.mockResolvedValue(mockVehicle);
      prisma.driver.findUnique.mockResolvedValue(mockDriver);
      prisma.vehicleAllocation.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['driverId', 'allocationDate'] },
      });

      await expect(
        allocationService.create({
          vehicleId: 2,
          driverId: 1,
          allocationDate: '2026-01-25',
        })
      ).rejects.toThrow(ConflictError);
    });

    it('should reject if vehicle not found', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(null);
      prisma.driver.findUnique.mockResolvedValue({ id: 1 });

      await expect(
        allocationService.create({
          vehicleId: 999,
          driverId: 1,
          allocationDate: '2026-01-25',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should reject if driver not found', async () => {
      prisma.vehicle.findUnique.mockResolvedValue({ id: 1 });
      prisma.driver.findUnique.mockResolvedValue(null);

      await expect(
        allocationService.create({
          vehicleId: 1,
          driverId: 999,
          allocationDate: '2026-01-25',
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAvailableVehicles', () => {
    it('should return vehicles not allocated on date', async () => {
      const allVehicles = [
        { id: 1, registrationNumber: 'TX-FP-001' },
        { id: 2, registrationNumber: 'TX-FP-002' },
        { id: 3, registrationNumber: 'TX-FP-003' },
      ];

      // Vehicle 1 is already allocated
      prisma.vehicleAllocation.findMany.mockResolvedValue([{ vehicleId: 1 }]);
      prisma.vehicle.findMany.mockResolvedValue([
        { id: 2, registrationNumber: 'TX-FP-002' },
        { id: 3, registrationNumber: 'TX-FP-003' },
      ]);

      const result = await allocationService.getAvailableVehicles('2026-01-25');

      expect(result).toHaveLength(2);
      expect(result.map((v) => v.id)).toEqual([2, 3]);
    });
  });

  describe('update with optimistic locking', () => {
    const mockAllocation = {
      id: 1,
      vehicleId: 1,
      driverId: 1,
      version: 3,
      vehicle: { id: 1 },
      driver: { id: 1 },
    };

    it('should reject update without version field', async () => {
      prisma.vehicleAllocation.findUnique.mockResolvedValue(mockAllocation);
      prisma.shift.findFirst.mockResolvedValue(null);

      await expect(
        allocationService.update(1, { driverId: 2 })
      ).rejects.toThrow(BadRequestError);
    });

    it('should reject update when version does not match', async () => {
      prisma.vehicleAllocation.findUnique.mockResolvedValue(mockAllocation);
      prisma.shift.findFirst.mockResolvedValue(null);

      const mockTx = {
        vehicleAllocation: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          findUnique: jest.fn().mockResolvedValue({ id: 1, version: 5 }),
        },
      };
      prisma.$transaction.mockImplementation((cb) => cb(mockTx));

      await expect(
        allocationService.update(1, { driverId: 2, version: 3 })
      ).rejects.toThrow(ConflictError);
    });

    it('should succeed when version matches', async () => {
      const updatedAllocation = {
        id: 1,
        vehicleId: 1,
        driverId: 2,
        version: 4,
        vehicle: { id: 1 },
        driver: { id: 2 },
      };

      prisma.vehicleAllocation.findUnique.mockResolvedValue(mockAllocation);
      prisma.shift.findFirst.mockResolvedValue(null);

      const mockTx = {
        vehicleAllocation: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUnique: jest.fn().mockResolvedValue(updatedAllocation),
        },
      };
      prisma.$transaction.mockImplementation((cb) => cb(mockTx));

      const result = await allocationService.update(1, { driverId: 2, version: 3 });

      expect(result.version).toBe(4);
      expect(mockTx.vehicleAllocation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, version: 3 },
          data: expect.objectContaining({
            driverId: 2,
            version: { increment: 1 },
          }),
        })
      );
    });

    it('should reject update when active shift exists', async () => {
      prisma.vehicleAllocation.findUnique.mockResolvedValue(mockAllocation);
      prisma.shift.findFirst.mockResolvedValue({ id: 1, status: 'active' });

      await expect(
        allocationService.update(1, { driverId: 2, version: 3 })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('remove', () => {
    it('should delete allocation if no shifts', async () => {
      const mockAllocation = {
        id: 1,
        vehicleId: 1,
        driverId: 1,
        vehicle: { id: 1 },
        driver: { id: 1 },
      };

      prisma.vehicleAllocation.findUnique.mockResolvedValue(mockAllocation);
      prisma.shift.count.mockResolvedValue(0);
      prisma.vehicleAllocation.delete.mockResolvedValue(mockAllocation);

      await expect(allocationService.remove(1)).resolves.not.toThrow();
    });

    it('should reject delete if shifts exist', async () => {
      const mockAllocation = {
        id: 1,
        vehicleId: 1,
        driverId: 1,
        vehicle: { id: 1 },
        driver: { id: 1 },
      };

      prisma.vehicleAllocation.findUnique.mockResolvedValue(mockAllocation);
      prisma.shift.count.mockResolvedValue(1); // Has shift

      await expect(allocationService.remove(1)).rejects.toThrow(ConflictError);
    });
  });
});

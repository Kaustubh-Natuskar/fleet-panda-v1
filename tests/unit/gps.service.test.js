'use strict';

/**
 * Unit Tests for GPS Service
 * Tests that GPS requires active shift
 */

jest.mock('../../src/utils/prisma', () => ({
  vehicle: {
    findUnique: jest.fn(),
  },
  shift: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  gpsLocation: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  driver: {
    findUnique: jest.fn(),
  },
}));

const prisma = require('../../src/utils/prisma');
const gpsService = require('../../src/services/gps.service');
const { BadRequestError, NotFoundError } = require('../../src/utils/errors');

describe('GPS Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should record GPS when vehicle has active shift', async () => {
      const mockVehicle = { id: 1, registrationNumber: 'TX-FP-001' };
      const mockShift = {
        id: 1,
        driverId: 1,
        status: 'active',
        vehicleAllocation: { vehicleId: 1 },
      };
      const mockGps = {
        id: 1,
        vehicleId: 1,
        shiftId: 1,
        latitude: 29.7604,
        longitude: -95.3698,
        vehicle: mockVehicle,
        shift: { ...mockShift, driver: { id: 1, name: 'John' } },
      };

      prisma.vehicle.findUnique.mockResolvedValue(mockVehicle);
      prisma.shift.findFirst.mockResolvedValue(mockShift);
      prisma.gpsLocation.create.mockResolvedValue(mockGps);

      const result = await gpsService.create({
        vehicleId: 1,
        latitude: 29.7604,
        longitude: -95.3698,
      });

      expect(result.shiftId).toBe(1);
      expect(result.latitude).toBe(29.7604);
    });

    it('should reject GPS if vehicle has no active shift', async () => {
      const mockVehicle = { id: 1, registrationNumber: 'TX-FP-001' };

      prisma.vehicle.findUnique.mockResolvedValue(mockVehicle);
      prisma.shift.findFirst.mockResolvedValue(null); // No active shift

      await expect(
        gpsService.create({
          vehicleId: 1,
          latitude: 29.7604,
          longitude: -95.3698,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should reject GPS if vehicle not found', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(null);

      await expect(
        gpsService.create({
          vehicleId: 999,
          latitude: 29.7604,
          longitude: -95.3698,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should accept optional recordedAt timestamp', async () => {
      const mockVehicle = { id: 1, registrationNumber: 'TX-FP-001' };
      const mockShift = { id: 1, status: 'active' };
      const customTime = new Date('2026-01-20T10:30:00Z');

      prisma.vehicle.findUnique.mockResolvedValue(mockVehicle);
      prisma.shift.findFirst.mockResolvedValue(mockShift);
      prisma.gpsLocation.create.mockResolvedValue({
        id: 1,
        vehicleId: 1,
        shiftId: 1,
        latitude: 29.7604,
        longitude: -95.3698,
        recordedAt: customTime,
      });

      const result = await gpsService.create({
        vehicleId: 1,
        latitude: 29.7604,
        longitude: -95.3698,
        recordedAt: customTime,
      });

      expect(prisma.gpsLocation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recordedAt: customTime,
          }),
        })
      );
    });
  });
});

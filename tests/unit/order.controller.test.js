/**
 * Unit Tests for Order Controller
 * Tests HTTP layer - request handling and response formatting
 */

// Mock the service before importing controller
jest.mock('../../src/services/order.service', () => ({
  getAll: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  assign: jest.fn(),
  startOrder: jest.fn(),
  completeOrder: jest.fn(),
  failOrder: jest.fn(),
}));

const orderService = require('../../src/services/order.service');
const orderController = require('../../src/controllers/order.controller');
const { NotFoundError, ConflictError, BadRequestError } = require('../../src/utils/errors');

describe('Order Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      params: {},
      body: {},
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('getAll', () => {
    it('should return all orders with 200 status', async () => {
      const mockOrders = [
        { id: 1, status: 'pending', quantity: 1000 },
        { id: 2, status: 'assigned', quantity: 2000 },
      ];
      orderService.getAll.mockResolvedValue(mockOrders);
      mockReq.query = { status: 'pending' };

      await orderController.getAll(mockReq, mockRes, mockNext);

      expect(orderService.getAll).toHaveBeenCalledWith({ status: 'pending' });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrders,
      });
    });

    it('should call next on service error', async () => {
      const error = new Error('Database error');
      orderService.getAll.mockRejectedValue(error);

      await orderController.getAll(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getById', () => {
    it('should return order with 200 status', async () => {
      const mockOrder = { id: 1, status: 'pending', quantity: 1000 };
      orderService.getById.mockResolvedValue(mockOrder);
      mockReq.params.id = 1;

      await orderController.getById(mockReq, mockRes, mockNext);

      expect(orderService.getById).toHaveBeenCalledWith(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrder,
      });
    });

    it('should call next when order not found', async () => {
      const error = new NotFoundError('Order 999 not found');
      orderService.getById.mockRejectedValue(error);
      mockReq.params.id = 999;

      await orderController.getById(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('create', () => {
    it('should create order with 201 status', async () => {
      const mockOrder = { id: 1, destinationId: 3, productId: 1, quantity: 5000 };
      orderService.create.mockResolvedValue(mockOrder);
      mockReq.body = { destinationId: 3, productId: 1, quantity: 5000 };

      await orderController.create(mockReq, mockRes, mockNext);

      expect(orderService.create).toHaveBeenCalledWith(mockReq.body);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrder,
      });
    });
  });

  describe('assign', () => {
    it('should assign order to driver', async () => {
      const mockOrder = { id: 1, status: 'assigned', assignedDriverId: 1 };
      orderService.assign.mockResolvedValue(mockOrder);
      mockReq.params.id = 1;
      mockReq.body = { driverId: 1, assignedDate: '2026-01-25' };

      await orderController.assign(mockReq, mockRes, mockNext);

      expect(orderService.assign).toHaveBeenCalledWith(1, mockReq.body);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('startOrder', () => {
    it('should start order delivery', async () => {
      const mockOrder = { id: 1, status: 'in_progress' };
      orderService.startOrder.mockResolvedValue(mockOrder);
      mockReq.params.id = 1;
      mockReq.body = { driverId: 1 };

      await orderController.startOrder(mockReq, mockRes, mockNext);

      expect(orderService.startOrder).toHaveBeenCalledWith(1, 1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrder,
      });
    });

    it('should call next when no active shift', async () => {
      const error = new BadRequestError('No active shift');
      orderService.startOrder.mockRejectedValue(error);
      mockReq.params.id = 1;
      mockReq.body = { driverId: 1 };

      await orderController.startOrder(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('completeOrder', () => {
    it('should complete order successfully', async () => {
      const mockOrder = { id: 1, status: 'completed' };
      orderService.completeOrder.mockResolvedValue(mockOrder);
      mockReq.params.id = 1;
      mockReq.body = { driverId: 1 };

      await orderController.completeOrder(mockReq, mockRes, mockNext);

      expect(orderService.completeOrder).toHaveBeenCalledWith(1, 1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrder,
      });
    });

    it('should call next when order not in_progress', async () => {
      const error = new ConflictError('Order status must be in_progress');
      orderService.completeOrder.mockRejectedValue(error);
      mockReq.params.id = 1;
      mockReq.body = { driverId: 1 };

      await orderController.completeOrder(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('failOrder', () => {
    it('should fail order with reason', async () => {
      const mockOrder = { id: 1, status: 'failed' };
      orderService.failOrder.mockResolvedValue(mockOrder);
      mockReq.params.id = 1;
      mockReq.body = { driverId: 1, reason: 'Customer not available' };

      await orderController.failOrder(mockReq, mockRes, mockNext);

      expect(orderService.failOrder).toHaveBeenCalledWith(1, 1, 'Customer not available');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrder,
      });
    });
  });

  describe('remove', () => {
    it('should delete order with 204 status', async () => {
      orderService.remove.mockResolvedValue(undefined);
      mockReq.params.id = 1;

      await orderController.remove(mockReq, mockRes, mockNext);

      expect(orderService.remove).toHaveBeenCalledWith(1);
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });
  });
});

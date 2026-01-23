'use strict';

/**
 * Unit Tests for Error Middleware
 * Tests error handling and response formatting
 */

const errorMiddleware = require('../../src/middleware/error.middleware');
const { AppError, NotFoundError, ConflictError, BadRequestError, ValidationError } = require('../../src/utils/errors');

describe('Error Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('AppError handling', () => {
    it('should handle NotFoundError with 404 status', () => {
      const error = new NotFoundError('Driver not found');

      errorMiddleware(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Driver not found',
        },
      });
    });

    it('should handle ConflictError with 409 status', () => {
      const error = new ConflictError('Vehicle already allocated');

      errorMiddleware(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Vehicle already allocated',
        },
      });
    });

    it('should handle BadRequestError with 400 status', () => {
      const error = new BadRequestError('Invalid driver ID');

      errorMiddleware(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid driver ID',
        },
      });
    });

    it('should handle ValidationError with 400 status', () => {
      const error = new ValidationError('quantity must be positive');

      errorMiddleware(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'quantity must be positive',
        },
      });
    });
  });

  describe('Prisma error handling', () => {
    it('should handle P2002 (unique constraint) with 409 status', () => {
      const error = { code: 'P2002', message: 'Unique constraint failed' };

      errorMiddleware(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'A record with this value already exists',
        },
      });
    });

    it('should handle P2025 (record not found) with 404 status', () => {
      const error = { code: 'P2025', message: 'Record not found' };

      errorMiddleware(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Record not found',
        },
      });
    });

    it('should handle P2003 (foreign key constraint) with 400 status', () => {
      const error = { code: 'P2003', message: 'Foreign key constraint failed' };

      errorMiddleware(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FOREIGN_KEY_ERROR',
          message: 'Referenced record does not exist',
        },
      });
    });
  });

  describe('JSON parsing error handling', () => {
    it('should handle invalid JSON with 400 status', () => {
      const error = new SyntaxError('Unexpected token');
      error.status = 400;
      error.body = '{ invalid json }';

      errorMiddleware(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
        },
      });
    });
  });

  describe('Unknown error handling', () => {
    it('should handle unknown errors with 500 status', () => {
      const error = new Error('Something went wrong');

      errorMiddleware(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong', // Shows message in test env
        },
      });
    });

    it('should hide error details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Database connection failed');

      errorMiddleware(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });

      process.env.NODE_ENV = originalEnv;
    });
  });
});

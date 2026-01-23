'use strict';

/**
 * Standardized API Response Helpers
 * Ensures consistent response format across all endpoints
 */

/**
 * Send success response
 * @param {Response} res - Express response object
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const success = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data,
  });
};

/**
 * Send created response (201)
 * @param {Response} res - Express response object
 * @param {*} data - Created resource data
 */
const created = (res, data) => {
  success(res, data, 201);
};

/**
 * Send no content response (204)
 * @param {Response} res - Express response object
 */
const noContent = (res) => {
  res.status(204).send();
};

/**
 * Send error response
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} code - Error code
 */
const error = (res, message, statusCode = 500, code = 'INTERNAL_ERROR') => {
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};

module.exports = {
  success,
  created,
  noContent,
  error,
};

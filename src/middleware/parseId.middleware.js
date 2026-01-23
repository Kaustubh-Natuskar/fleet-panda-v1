'use strict';

const { BadRequestError } = require('../utils/errors');

/**
 * Parse ID Middleware
 * Converts string ID parameters to integers
 * This handles Express's default behavior of passing params as strings
 */
const parseId = (paramName = 'id') => {
  return (req, res, next) => {
    if (req.params[paramName]) {
      const parsed = parseInt(req.params[paramName], 10);
      if (isNaN(parsed) || parsed < 1) {
        throw new BadRequestError(`Invalid ${paramName}: must be a positive integer`);
      }
      req.params[paramName] = parsed;
    }
    next();
  };
};

/**
 * Parse multiple ID parameters
 * @param {...string} paramNames - Names of parameters to parse
 */
const parseIds = (...paramNames) => {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      if (req.params[paramName]) {
        const parsed = parseInt(req.params[paramName], 10);
        if (isNaN(parsed) || parsed < 1) {
          throw new BadRequestError(`Invalid ${paramName}: must be a positive integer`);
        }
        req.params[paramName] = parsed;
      }

    }
    next();
  };
};

module.exports = { parseId, parseIds };


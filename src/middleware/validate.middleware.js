const { ValidationError } = require('../utils/errors');

/**
 * Validation Middleware Factory
 * Creates middleware that validates request data against Joi schemas
 *
 * @param {Object} schema - Joi validation schema with body, params, query properties
 * @returns {Function} Express middleware function
 */
const validate = (schema) => {
  return (req, res, next) => {
    const validationOptions = {
      abortEarly: false, // Collect all errors, not just the first
      stripUnknown: true, // Remove unknown fields
      convert: true, // Convert strings to appropriate types
    };

    const errors = [];

    // Validate request body
    if (schema.body) {
      const { error, value } = schema.body.validate(req.body, validationOptions);
      if (error) {
        errors.push(...error.details.map((d) => ({ field: d.path.join('.'), message: d.message })));
      } else {
        req.body = value;
      }
    }

    // Validate URL parameters
    if (schema.params) {
      const { error, value } = schema.params.validate(req.params, validationOptions);
      if (error) {
        errors.push(...error.details.map((d) => ({ field: d.path.join('.'), message: d.message })));
      } else {
        req.params = value;
      }
    }

    // Validate query string
    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, validationOptions);
      if (error) {
        errors.push(...error.details.map((d) => ({ field: d.path.join('.'), message: d.message })));
      } else {
        req.query = value;
      }
    }

    // If there are validation errors, throw ValidationError
    if (errors.length > 0) {
      const errorMessage = errors.map((e) => `${e.field}: ${e.message}`).join('; ');
      throw new ValidationError(errorMessage);
    }

    next();
  };
};

module.exports = validate;

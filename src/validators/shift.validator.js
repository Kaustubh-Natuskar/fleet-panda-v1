'use strict';

const Joi = require('joi');

// Custom validation for date (must be today or future)
const today = new Date();
today.setHours(0, 0, 0, 0);

const schedule = {
  body: Joi.object({
    driverId: Joi.number().integer().positive().required(),
    shiftDate: Joi.date().iso().min(today).required()
      .messages({
        'date.min': 'Shift date cannot be in the past',
      }),
  }),
};

const start = {
  body: Joi.object({
    driverId: Joi.number().integer().positive().required(),
  }),
};

const end = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object({
    driverId: Joi.number().integer().positive().required(),
  }),
};

const getById = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};

const getByDriver = {
  params: Joi.object({
    driverId: Joi.number().integer().positive().required(),
  }),
  query: Joi.object({
    status: Joi.string().valid('scheduled', 'active', 'completed'),
  }),
};

module.exports = {
  schedule,
  start,
  end,
  getById,
  getByDriver,
};

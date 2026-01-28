'use strict';

const Joi = require('joi');
const { getTodayAtMidnight } = require('../utils/date-utils');

const schedule = {
  body: Joi.object({
    driverId: Joi.number().integer().positive().required(),
    shiftDate: Joi.date().iso().required()
      .custom((value, helpers) => {
        if (value < getTodayAtMidnight()) {
          return helpers.error('date.min');
        }
        return value;
      })
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

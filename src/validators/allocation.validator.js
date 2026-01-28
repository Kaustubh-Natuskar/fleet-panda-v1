'use strict';

const Joi = require('joi');
const { getTodayAtMidnight } = require('../utils/date-utils');

const create = {
  body: Joi.object({
    vehicleId: Joi.number().integer().positive().required(),
    driverId: Joi.number().integer().positive().required(),
    allocationDate: Joi.date().iso().required()
      .custom((value, helpers) => {
        if (value < getTodayAtMidnight()) {
          return helpers.error('date.min');
        }
        return value;
      })
      .messages({
        'date.min': 'Allocation date cannot be in the past',
      }),
  }),
};

const update = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object({
    vehicleId: Joi.number().integer().positive(),
    driverId: Joi.number().integer().positive(),
    allocationDate: Joi.date().iso()
      .custom((value, helpers) => {
        if (value < getTodayAtMidnight()) {
          return helpers.error('date.min');
        }
        return value;
      })
      .messages({
        'date.min': 'Allocation date cannot be in the past',
      }),
  }).min(1),
};

const getById = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};

const getByDate = {
  query: Joi.object({
    date: Joi.date().iso(),
  }),
};

const getAvailableVehicles = {
  query: Joi.object({
    date: Joi.date().iso().required(),
  }),
};

module.exports = {
  create,
  update,
  getById,
  getByDate,
  getAvailableVehicles,
};

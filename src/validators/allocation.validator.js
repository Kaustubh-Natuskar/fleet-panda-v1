const Joi = require('joi');

// Custom validation for date (must be today or future)
const today = new Date();
today.setHours(0, 0, 0, 0);

const create = {
  body: Joi.object({
    vehicleId: Joi.number().integer().positive().required(),
    driverId: Joi.number().integer().positive().required(),
    allocationDate: Joi.date().iso().min(today).required()
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
    allocationDate: Joi.date().iso().min(today)
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

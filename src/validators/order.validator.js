const Joi = require('joi');

const create = {
  body: Joi.object({
    destinationId: Joi.number().integer().positive().required(),
    productId: Joi.number().integer().positive().required(),
    quantityGallons: Joi.number().positive().required(),
    assignedDriverId: Joi.number().integer().positive().allow(null),
    assignedDate: Joi.date().iso().allow(null),
  }),
};

const update = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object({
    destinationId: Joi.number().integer().positive(),
    productId: Joi.number().integer().positive(),
    quantityGallons: Joi.number().positive(),
    status: Joi.string().valid('pending', 'assigned', 'in_progress', 'completed', 'failed'),
  }).min(1),
};

const getById = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};

const assign = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object({
    driverId: Joi.number().integer().positive().required(),
    assignedDate: Joi.date().iso().allow(null), // Defaults to today if not provided
  }),
};

const startOrder = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object({
    driverId: Joi.number().integer().positive().required(),
  }),
};

const completeOrder = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object({
    driverId: Joi.number().integer().positive().required(),
  }),
};

const failOrder = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object({
    driverId: Joi.number().integer().positive().required(),
    reason: Joi.string().max(500).required(),
  }),
};

const getByStatus = {
  query: Joi.object({
    status: Joi.string().valid('pending', 'assigned', 'in_progress', 'completed', 'failed'),
    driverId: Joi.number().integer().positive(),
    date: Joi.date().iso(),
  }),
};

module.exports = {
  create,
  update,
  getById,
  assign,
  startOrder,
  completeOrder,
  failOrder,
  getByStatus,
};

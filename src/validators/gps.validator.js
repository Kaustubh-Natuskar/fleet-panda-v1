'use strict';

const Joi = require('joi');

const create = {
  body: Joi.object({
    vehicleId: Joi.number().integer().positive().required(),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    recordedAt: Joi.date().iso().default(() => new Date()), // Optional, defaults to now
  }),
};

const getByVehicle = {
  params: Joi.object({
    vehicleId: Joi.number().integer().positive().required(),
  }),
  query: Joi.object({
    from: Joi.date().iso(),
    to: Joi.date().iso(),
    limit: Joi.number().integer().min(1).max(1000).default(100),
  }),
};

const getByDriver = {
  params: Joi.object({
    driverId: Joi.number().integer().positive().required(),
  }),
  query: Joi.object({
    from: Joi.date().iso(),
    to: Joi.date().iso(),
    limit: Joi.number().integer().min(1).max(1000).default(100),
  }),
};

module.exports = {
  create,
  getByVehicle,
  getByDriver,
};

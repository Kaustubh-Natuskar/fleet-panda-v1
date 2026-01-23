'use strict';

const Joi = require('joi');

const upsert = {
  body: Joi.object({
    locationId: Joi.number().integer().positive().required(),
    productId: Joi.number().integer().positive().required(),
    quantity: Joi.number().min(0).required(),
  }),
};

const getByLocation = {
  params: Joi.object({
    locationId: Joi.number().integer().positive().required(),
  }),
};

const adjust = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object({
    adjustment: Joi.number().required(), // Can be positive or negative
    reason: Joi.string().max(200).allow(null, ''),
  }),
};

module.exports = {
  upsert,
  getByLocation,
  adjust,
};

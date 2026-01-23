'use strict';

const Joi = require('joi');

const create = {
  body: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    phone: Joi.string().max(20).allow(null, ''),
    email: Joi.string().email().max(200).allow(null, ''),
    licenseNumber: Joi.string().max(50).allow(null, ''),
  }),
};

const update = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object({
    name: Joi.string().min(1).max(200),
    phone: Joi.string().max(20).allow(null, ''),
    email: Joi.string().email().max(200).allow(null, ''),
    licenseNumber: Joi.string().max(50).allow(null, ''),
  }).min(1),
};

const getById = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};

module.exports = {
  create,
  update,
  getById,
};

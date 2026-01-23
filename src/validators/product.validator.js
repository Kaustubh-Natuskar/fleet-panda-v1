'use strict';

const Joi = require('joi');

const create = {
  body: Joi.object({
    name: Joi.string().min(1).max(100).required()
  }),
};

const update = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object({
    name: Joi.string().min(1).max(100)
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

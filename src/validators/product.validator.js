const Joi = require('joi');

const create = {
  body: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    unit: Joi.string().min(1).max(50).default('gallons'),
  }),
};

const update = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object({
    name: Joi.string().min(1).max(100),
    unit: Joi.string().min(1).max(50),
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

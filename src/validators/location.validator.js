const Joi = require('joi');

const create = {
  body: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    type: Joi.string().valid('hub', 'terminal').required(),
    address: Joi.string().max(500).allow(null, ''),
    latitude: Joi.number().min(-90).max(90).allow(null),
    longitude: Joi.number().min(-180).max(180).allow(null),
  }),
};

const update = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object({
    name: Joi.string().min(1).max(200),
    type: Joi.string().valid('hub', 'terminal'),
    address: Joi.string().max(500).allow(null, ''),
    latitude: Joi.number().min(-90).max(90).allow(null),
    longitude: Joi.number().min(-180).max(180).allow(null),
  }).min(1),
};

const getById = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};

const getByType = {
  query: Joi.object({
    type: Joi.string().valid('hub', 'terminal'),
  }),
};

module.exports = {
  create,
  update,
  getById,
  getByType,
};

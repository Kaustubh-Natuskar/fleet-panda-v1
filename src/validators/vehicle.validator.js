const Joi = require('joi');

const create = {
  body: Joi.object({
    registrationNumber: Joi.string().min(1).max(50).required(),
    fuelType: Joi.string().max(50).allow(null, ''),
    capacityGallons: Joi.number().integer().positive().allow(null),
  }),
};

const update = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object({
    registrationNumber: Joi.string().min(1).max(50),
    fuelType: Joi.string().max(50).allow(null, ''),
    capacityGallons: Joi.number().integer().positive().allow(null),
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

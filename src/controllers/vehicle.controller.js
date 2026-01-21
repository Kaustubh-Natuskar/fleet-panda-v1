const vehicleService = require('../services/vehicle.service');
const { success, created, noContent } = require('../utils/response');

const getAll = async (req, res, next) => {
  try {
    const vehicles = await vehicleService.getAll();
    success(res, vehicles);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.getById(req.params.id);
    success(res, vehicle);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.create(req.body);
    created(res, vehicle);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.update(req.params.id, req.body);
    success(res, vehicle);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await vehicleService.remove(req.params.id);
    noContent(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};

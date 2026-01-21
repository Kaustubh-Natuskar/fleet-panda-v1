const allocationService = require('../services/allocation.service');
const { success, created, noContent } = require('../utils/response');

const getAll = async (req, res, next) => {
  try {
    const allocations = await allocationService.getAll(req.query.date);
    success(res, allocations);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const allocation = await allocationService.getById(req.params.id);
    success(res, allocation);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const allocation = await allocationService.create(req.body);
    created(res, allocation);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const allocation = await allocationService.update(req.params.id, req.body);
    success(res, allocation);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await allocationService.remove(req.params.id);
    noContent(res);
  } catch (error) {
    next(error);
  }
};

const getAvailableVehicles = async (req, res, next) => {
  try {
    const vehicles = await allocationService.getAvailableVehicles(req.query.date);
    success(res, vehicles);
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
  getAvailableVehicles,
};

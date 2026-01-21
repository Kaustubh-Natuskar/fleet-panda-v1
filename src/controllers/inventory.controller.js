const inventoryService = require('../services/inventory.service');
const { success, created } = require('../utils/response');

const getAll = async (req, res, next) => {
  try {
    const inventory = await inventoryService.getAll();
    success(res, inventory);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const inventory = await inventoryService.getById(req.params.id);
    success(res, inventory);
  } catch (error) {
    next(error);
  }
};

const getByLocation = async (req, res, next) => {
  try {
    const inventory = await inventoryService.getByLocation(req.params.locationId);
    success(res, inventory);
  } catch (error) {
    next(error);
  }
};

const upsert = async (req, res, next) => {
  try {
    const inventory = await inventoryService.upsert(req.body);
    success(res, inventory);
  } catch (error) {
    next(error);
  }
};

const adjust = async (req, res, next) => {
  try {
    const inventory = await inventoryService.adjust(
      req.params.id,
      req.body.adjustment,
      req.body.reason
    );
    success(res, inventory);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  getByLocation,
  upsert,
  adjust,
};

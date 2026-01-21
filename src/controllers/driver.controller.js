const driverService = require('../services/driver.service');
const { success, created, noContent } = require('../utils/response');

const getAll = async (req, res, next) => {
  try {
    const drivers = await driverService.getAll();
    success(res, drivers);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const driver = await driverService.getById(req.params.id);
    success(res, driver);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const driver = await driverService.create(req.body);
    created(res, driver);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const driver = await driverService.update(req.params.id, req.body);
    success(res, driver);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await driverService.remove(req.params.id);
    noContent(res);
  } catch (error) {
    next(error);
  }
};

const getShifts = async (req, res, next) => {
  try {
    const shifts = await driverService.getShifts(req.params.id, req.query.status);
    success(res, shifts);
  } catch (error) {
    next(error);
  }
};

const getOrders = async (req, res, next) => {
  try {
    const orders = await driverService.getOrders(req.params.id, req.query.status);
    success(res, orders);
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
  getShifts,
  getOrders,
};

const shiftService = require('../services/shift.service');
const { success, created } = require('../utils/response');

const getAll = async (req, res, next) => {
  try {
    const shifts = await shiftService.getAll(req.query.status);
    success(res, shifts);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const shift = await shiftService.getById(req.params.id);
    success(res, shift);
  } catch (error) {
    next(error);
  }
};

const schedule = async (req, res, next) => {
  try {
    const shift = await shiftService.schedule(req.body);
    created(res, shift);
  } catch (error) {
    next(error);
  }
};

const start = async (req, res, next) => {
  try {
    const shift = await shiftService.start(req.body);
    success(res, shift);
  } catch (error) {
    next(error);
  }
};

const end = async (req, res, next) => {
  try {
    const shift = await shiftService.end(req.params.id, req.body.driverId);
    success(res, shift);
  } catch (error) {
    next(error);
  }
};

const getByDriver = async (req, res, next) => {
  try {
    const shifts = await shiftService.getByDriver(req.params.driverId, req.query.status);
    success(res, shifts);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  schedule,
  start,
  end,
  getByDriver,
};

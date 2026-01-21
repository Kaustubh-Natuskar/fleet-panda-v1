const gpsService = require('../services/gps.service');
const { success, created } = require('../utils/response');

const create = async (req, res, next) => {
  try {
    const gpsLocation = await gpsService.create(req.body);
    created(res, gpsLocation);
  } catch (error) {
    next(error);
  }
};

const getByVehicle = async (req, res, next) => {
  try {
    const locations = await gpsService.getByVehicle(req.params.vehicleId, req.query);
    success(res, locations);
  } catch (error) {
    next(error);
  }
};

const getByDriver = async (req, res, next) => {
  try {
    const locations = await gpsService.getByDriver(req.params.driverId, req.query);
    success(res, locations);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  getByVehicle,
  getByDriver,
};

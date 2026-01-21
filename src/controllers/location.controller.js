const locationService = require('../services/location.service');
const { success, created, noContent } = require('../utils/response');

const getAll = async (req, res, next) => {
  try {
    const locations = await locationService.getAll(req.query.type);
    success(res, locations);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const location = await locationService.getById(req.params.id);
    success(res, location);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const location = await locationService.create(req.body);
    created(res, location);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const location = await locationService.update(req.params.id, req.body);
    success(res, location);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await locationService.remove(req.params.id);
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

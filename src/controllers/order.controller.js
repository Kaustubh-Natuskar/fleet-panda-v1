const orderService = require('../services/order.service');
const { success, created, noContent } = require('../utils/response');

const getAll = async (req, res, next) => {
  try {
    const orders = await orderService.getAll(req.query);
    success(res, orders);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const order = await orderService.getById(req.params.id);
    success(res, order);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const order = await orderService.create(req.body);
    created(res, order);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const order = await orderService.update(req.params.id, req.body);
    success(res, order);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await orderService.remove(req.params.id);
    noContent(res);
  } catch (error) {
    next(error);
  }
};

const assign = async (req, res, next) => {
  try {
    const order = await orderService.assign(req.params.id, req.body);
    success(res, order);
  } catch (error) {
    next(error);
  }
};

const startOrder = async (req, res, next) => {
  try {
    const order = await orderService.startOrder(req.params.id, req.body.driverId);
    success(res, order);
  } catch (error) {
    next(error);
  }
};

const completeOrder = async (req, res, next) => {
  try {
    const order = await orderService.completeOrder(req.params.id, req.body.driverId);
    success(res, order);
  } catch (error) {
    next(error);
  }
};

const failOrder = async (req, res, next) => {
  try {
    const order = await orderService.failOrder(
      req.params.id,
      req.body.driverId,
      req.body.reason
    );
    success(res, order);
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
  assign,
  startOrder,
  completeOrder,
  failOrder,
};

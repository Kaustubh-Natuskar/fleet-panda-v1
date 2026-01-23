'use strict';

const fleetService = require('../services/fleet.service');
const { success } = require('../utils/response');

const getStatus = async (req, res, next) => {
  try {
    const status = await fleetService.getStatus();
    success(res, status);
  } catch (error) {
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const summary = await fleetService.getSummary();
    success(res, summary);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStatus,
  getSummary,
};

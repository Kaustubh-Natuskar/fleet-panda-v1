'use strict';

/**
 * Get today's date at midnight (00:00:00.000)
 * @returns {Date}
 */
const getTodayAtMidnight = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

module.exports = {
  getTodayAtMidnight,
};

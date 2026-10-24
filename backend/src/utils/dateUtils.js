/**
 * Date utility functions for HCM Lite
 */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Returns whether a date falls on a weekend
 * @param {Date|string} date 
 * @param {Array<string>} weekendDays (default ['Saturday', 'Sunday'])
 * @returns {boolean}
 */
function isWeekend(date, weekendDays = ['Saturday', 'Sunday']) {
  const d = new Date(date);
  const dayName = DAY_NAMES[d.getDay()];
  return weekendDays.includes(dayName);
}

/**
 * Formats a Date object or string to YYYY-MM-DD
 * @param {Date|string} date 
 * @returns {string}
 */
function toDateString(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates number of working days between start and end date (inclusive)
 * Skipping configured weekends and public holidays
 * 
 * @param {string} startDateStr 'YYYY-MM-DD'
 * @param {string} endDateStr 'YYYY-MM-DD'
 * @param {Array<string>} weekendDays 
 * @param {Array<string>} publicHolidayDateStrings 
 * @returns {number}
 */
function calculateWorkingDays(startDateStr, endDateStr, weekendDays = ['Saturday', 'Sunday'], publicHolidayDateStrings = []) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return 0;
  }

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const curDateStr = toDateString(current);
    const dayName = DAY_NAMES[current.getDay()];

    const isWknd = weekendDays.includes(dayName);
    const isHoliday = publicHolidayDateStrings.includes(curDateStr);

    if (!isWknd && !isHoliday) {
      count++;
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Calculates working days in a given month (1-12) and year
 * @param {number} year 
 * @param {number} month (1-12)
 * @param {Array<string>} weekendDays 
 * @param {Array<string>} publicHolidayDateStrings 
 * @returns {number}
 */
function getWorkingDaysInMonth(year, month, weekendDays = ['Saturday', 'Sunday'], publicHolidayDateStrings = []) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStr = String(month).padStart(2, '0');
  const startDateStr = `${year}-${monthStr}-01`;
  const endDateStr = `${year}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;
  return calculateWorkingDays(startDateStr, endDateStr, weekendDays, publicHolidayDateStrings);
}

module.exports = {
  isWeekend,
  toDateString,
  calculateWorkingDays,
  getWorkingDaysInMonth
};


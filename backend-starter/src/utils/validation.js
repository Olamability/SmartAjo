/**
 * Validation Utilities
 * Shared validation functions to reduce code duplication
 */

/**
 * Validate and normalize pagination parameters
 * @param {number|string} page - Page number from query
 * @param {number|string} limit - Items per page from query
 * @param {number} maxLimit - Maximum allowed limit (default: 100)
 * @returns {{validPage: number, validLimit: number}} Validated parameters
 */
function validatePagination(page = 1, limit = 20, maxLimit = 100) {
  const validPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const validLimit = Math.max(1, Math.min(maxLimit, Number.parseInt(limit, 10) || 20));
  
  return { validPage, validLimit };
}

/**
 * Calculate pagination offset
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {number} Offset for database query
 */
function calculateOffset(page, limit) {
  return (page - 1) * limit;
}

module.exports = {
  validatePagination,
  calculateOffset
};

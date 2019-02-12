const db = require('../models');

/**
 * Check if an email address is in use.
 *
 * @param {string} email - An email address to check
 * @returns {Promise.<boolean>} - Returns a boolean indicating if the email is in use
 */

module.exports = async (email) => {
  const results = await db.models.user.findAll({where: {email}});
  return results.length > 0;
};

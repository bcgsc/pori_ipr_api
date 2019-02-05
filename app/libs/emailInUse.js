let db = require('../models/');

/**
 * Check if an email address is in use.
 *
 * @param email
 * @returns {Promise.<Boolean>}
 */
module.exports = async (email) => {
  const result = await db.models.user.findAll({where: {email: email}});
  if(result.length > 0){
    return true;
  }
  return false;
};
const db = require('../../models');

const {logger} = process;


/**
 * Get public version of record
 *
 * @param {string} ident - Germline report uuid ident
 *
 * @returns {Promise.<Array.<object>>} - Returns all germline reports with given ident
 */
const getPublic = async (ident) => {
  try {
    return db.models.germline_small_mutation_review.scope('public').findAll({where: {ident}});
  } catch (error) {
    logger.error(`Error while trying to retrieve public version of germline report ${error}`);
    throw new Error('Error while trying to retrieve public version of germline report');
  }
};

module.exports = {
  public: getPublic,
};

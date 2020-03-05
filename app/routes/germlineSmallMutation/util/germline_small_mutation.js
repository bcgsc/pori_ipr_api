const {Op} = require('sequelize');
const _ = require('lodash');
const db = require('../../../models');

const logger = require('../../../log');

/**
 * Retrieve user entries
 *
 * Supporting function
 *
 * @param {Array.<object>} users - Collection of user objects
 *
 * @returns {Promise.<Array.<object>>} - Returns an array of updated users
 */
const getUpdateUsers = async (users) => {
  if (users.length === 0) {
    return [];
  }

  try {
    return db.models.user.findAll({where: {ident: {[Op.in]: users}}});
  } catch (error) {
    logger.error(`There was an error while getting updated users ${error}`);
    throw new Error('There was an error while getting updated users');
  }
};


/**
 * Updates an existing report with supplied values
 *
 * @param {object} report - The model instance of an existing report
 * @param {object} data - Key-value paired object of values to be updated
 *
 * @returns {Promise.<object>} - Returns an updated model object
 */
const updateReport = async (report, data) => {
  const updateData = {};
  const resolveUsers = {};

  updateData.exported = data.exported;

  // Supported values to update
  if (data.biofx_assigned) {
    resolveUsers.biofx = data.biofx_assigned;
  }

  try {
    const users = await getUpdateUsers(Object.values(resolveUsers));
    if (users.length > 0 && _.find(users, {ident: data.biofx_assigned})) {
      updateData.biofx_assigned_id = _.find(users, {ident: data.biofx_assigned}).id;
    }

    return await db.models.germline_small_mutation.update(updateData, {
      where: {
        ident: report.ident,
      },
      individualHooks: true,
      paranoid: true,
    });
  } catch (error) {
    logger.error(`Error while trying to update supplied report ${error}`);
    throw new Error('Error while trying to update supplied report');
  }
};


/**
 * Get public version of record
 *
 * @param {string} ident - Germline report uuid ident
 *
 * @returns {Promise.<Array.<object>>} - Returns all public versions of germline reports with ident
 */
const getPublic = async (ident) => {
  try {
    return db.models.germline_small_mutation.scope('public').findAll({where: {ident}});
  } catch (error) {
    logger.error(`Error while retrieving public scope of germline report ${error}`);
    throw new Error('Error while retrieving public scope of germline report');
  }
};

module.exports = {
  public: getPublic,
  updateReport,
  getUpdateUsers,
};

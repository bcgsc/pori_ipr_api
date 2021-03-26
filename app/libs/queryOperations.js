const db = require('../models');


/**
 * Map the field you want to sort and direction of the sort to a "sort property"
 *
 * @param {string} field - One of: patientId, biopsyName, diagnosis, physician, state, caseType, or alternateIdentifier
 * @param {string} direction - Either asc or desc
 * @returns {Array<string|object>} - An array containing the field and the direction to sort
 */
const _getSortProperty = (field, direction) => {
  return {
    patientId: ['patientId', direction],
    biopsyName: ['biopsyName', direction],
    diagnosis: [
      {model: db.models.patientInformation, as: 'patientInformation'},
      'diagnosis',
      direction,
    ],
    physician: [
      {model: db.models.patientInformation, as: 'patientInformation'},
      'physician',
      direction,
    ],
    state: ['state', direction],
    caseType: [
      {model: db.models.patientInformation, as: 'patientInformation'},
      'caseType',
      direction,
    ],
    alternateIdentifier: ['alternateIdentifier', direction],
  }[field];
};


/**
 * Parses a report query string (args) that takes the form:
 * column:direction,column:direction...
 *
 * @param {string} args - The arguments to map to sort properties
 * @returns {Array<Array<string|object>>} - Returns an array containing all the different sort properties
 */
const parseReportSortQuery = (args) => {
  const sort = args.split(',');

  return sort.map((sortGroup) => {
    return _getSortProperty(...sortGroup.split(':'));
  });
};

module.exports = {
  parseReportSortQuery,
};

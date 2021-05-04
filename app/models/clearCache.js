const {batchDeleteKeysByPattern, flushAll} = require('../libs/cacheFunctions');

const FLUSH_ALL_MODELS = ['user', 'project'];

const CLEAR_REPORT_CACHE_MODELS = [
  'analysis_report', 'patientInformation', 'template', 'analysis_reports_user',
];

const CLEAR_GERMLINE_CACHE_MODELS = [
  'germlineSmallMutation', 'germlineSmallMutationVariant', 'germlineSmallMutationReview',
];

const CLEAR_USER_CACHE_MODELS = [
  'userGroup', 'userGroupMember', 'user_project',
];

/**
 * Clears relevant cache keys when a model has been updated
 * (i.e POST, PUT, DELETE)
 *
 * @param {string} modelName - Name of the updated model
 * @returns {Promise<undefined>} - Returns undefined if successful
 */
module.exports = async (modelName) => {
  if (FLUSH_ALL_MODELS.includes(modelName)) {
    return flushAll();
  }
  if (CLEAR_REPORT_CACHE_MODELS.includes(modelName)) {
    return batchDeleteKeysByPattern('/reports*');
  }
  if (CLEAR_GERMLINE_CACHE_MODELS.includes(modelName)) {
    return batchDeleteKeysByPattern('/germline*');
  }
  if (CLEAR_USER_CACHE_MODELS.includes(modelName)) {
    return batchDeleteKeysByPattern('/user*');
  }
  // Report summary sections
  switch (modelName) {
    case 'summary_microbial':
      return batchDeleteKeysByPattern('/reports/*/summary/microbial');
    case 'genomicAlterationsIdentified':
      return batchDeleteKeysByPattern('/reports/*/summary/genomic-alterations-identified');
    case 'comparators':
      return batchDeleteKeysByPattern('/reports/*/comparators');
    case 'mutationSignature':
      return batchDeleteKeysByPattern('/reports/*/mutation-signatures*');
    case 'mutationBurden':
      return batchDeleteKeysByPattern('/reports/*/mutation-burden');
    case 'immuneCellTypes':
      return batchDeleteKeysByPattern('/reports/*/immune-cell-types');
    case 'msi':
      return batchDeleteKeysByPattern('/reports/*/msi');
    case 'signatures':
      return batchDeleteKeysByPattern('/reports/*/signatures');
    default:
      return true;
  }
};

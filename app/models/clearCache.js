const {batchDeleteKeysByPattern, flushAll, removeKeys} = require('../libs/cacheFunctions');

const FLUSH_ALL_MODELS = ['user', 'project', 'template'];

const CLEAR_REPORT_CACHE_MODELS = [
  'analysis_report', 'patientInformation', 'analysis_reports_user',
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
 * @param {object} instance - Instance of model being updated
 * @param {string} method - Update method (i.e POST, PUT, DELETE)
 * @returns {Promise<undefined>} - Returns undefined if successful
 */
module.exports = async (instance, method) => {
  const modelName = instance.constructor.name;
  const {models} = instance.sequelize;


  if (FLUSH_ALL_MODELS.includes(modelName)) {
    if (method === 'POST') {
      return true;
    }
    return flushAll();
  }
  if (CLEAR_REPORT_CACHE_MODELS.includes(modelName)) {
    const id = (modelName === 'analysis_report') ? instance.id : instance.reportId;
    let report;
    try {
      report = await models.analysis_report.findOne({where: {id}, paranoid: false});
    } catch (error) {
      return batchDeleteKeysByPattern('/reports*');
    }

    if (!report || !report.ident) {
      return batchDeleteKeysByPattern('/reports*');
    }

    // If deleting report, remove all report sections from cache
    if (modelName === 'analysis_report' && method === 'DELETE') {
      return Promise.all([
        batchDeleteKeysByPattern(`/reports/${report.ident}*`),
        removeKeys('/reports'),
        batchDeleteKeysByPattern('/reports\\?*'),
      ]);
    }

    return Promise.all([
      removeKeys([`/reports/${report.ident}`, '/reports']),
      batchDeleteKeysByPattern('/reports\\?*'),
    ]);
  }
  if (CLEAR_GERMLINE_CACHE_MODELS.includes(modelName)) {
    const id = (modelName === 'germlineSmallMutation') ? instance.id : instance.germlineReportId;
    let report;
    try {
      report = await models.germlineSmallMutation.findOne({where: {id}, paranoid: false});
    } catch (error) {
      return batchDeleteKeysByPattern('/germline*');
    }

    if (!report || !report.ident) {
      return batchDeleteKeysByPattern('/germline*');
    }

    return Promise.all([
      removeKeys([`/germline/${report.ident}`, '/germline']),
      batchDeleteKeysByPattern('/germline\\?*'),
    ]);
  }
  if (CLEAR_USER_CACHE_MODELS.includes(modelName)) {
    if (modelName === 'userGroup') {
      return batchDeleteKeysByPattern('/user*');
    }

    const id = instance.user_id;
    let user;
    try {
      user = await models.user.findOne({where: {id}, paranoid: false});
    } catch (error) {
      return batchDeleteKeysByPattern('/user*');
    }

    if (!user || !user.username) {
      return batchDeleteKeysByPattern('/user*');
    }

    return removeKeys(`/user/${user.username}`);
  }

  if (!instance.reportId) {
    return true;
  }

  let report;
  try {
    report = await models.analysis_report.findOne({
      where: {id: instance.reportId}, paranoid: false,
    });
  } catch (error) {
    return batchDeleteKeysByPattern('/reports*');
  }

  if (!report || !report.ident) {
    // Unable to find report
    return batchDeleteKeysByPattern('/reports*');
  }

  // Report summary sections
  switch (modelName) {
    case 'summary_microbial':
      return removeKeys(`/reports/${report.ident}/summary/microbial`);
    case 'genomicAlterationsIdentified':
      return removeKeys(`/reports/${report.ident}/summary/genomic-alterations-identified`);
    case 'comparators':
      return removeKeys(`/reports/${report.ident}/comparators`);
    case 'mutationSignature':
      return batchDeleteKeysByPattern(`/reports/${report.ident}/mutation-signatures*`);
    case 'mutationBurden':
      return removeKeys(`/reports/${report.ident}/mutation-burden`);
    case 'immuneCellTypes':
      return removeKeys(`/reports/${report.ident}/immune-cell-types`);
    case 'msi':
      return removeKeys(`/reports/${report.ident}/msi`);
    case 'signatures':
      return removeKeys(`/reports/${report.ident}/signatures`);
    default:
      return true;
  }
};
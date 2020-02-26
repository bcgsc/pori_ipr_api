const BASE_EXCLUDE = ['id', 'ident', 'createdAt', 'updatedAt', 'deletedAt'];
const REPORT_EXCLUDE = BASE_EXCLUDE.concat(['report_id']);

module.exports = {
  BASE_EXCLUDE,
  REPORT_EXCLUDE,
};

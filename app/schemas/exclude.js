const BASE_EXCLUDE = ['id', 'ident', 'createdAt', 'updatedAt', 'deletedAt'];
const REPORT_EXCLUDE = BASE_EXCLUDE.concat(['reportId', 'geneId']);
const GERMLINE_EXCLUDE = [...BASE_EXCLUDE, 'germlineReportId'];

module.exports = {
  BASE_EXCLUDE,
  REPORT_EXCLUDE,
  GERMLINE_EXCLUDE,
};

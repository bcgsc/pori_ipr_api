module.exports = {
  up: (queryInterface) => {
    return queryInterface.renameColumn('pog_analysis_reports_users', 'report_id', 'pog_report_id');
  },

  down: (queryInterface) => {
    return queryInterface.renameColumn('pog_analysis_reports_users', 'pog_report_id', 'report_id');
  },
};

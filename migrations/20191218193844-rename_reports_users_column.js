'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.renameColumn('pog_analysis_reports_users', 'report_id', 'pog_report_id');
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.renameColumn('pog_analysis_reports_users', 'pog_report_id', 'report_id');
  },
};

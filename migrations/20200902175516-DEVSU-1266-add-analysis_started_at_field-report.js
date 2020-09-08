const REPORTS_TABLE = 'reports';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return queryInterface.addColumn(REPORTS_TABLE, 'analysis_started_at', Sequelize.DATE, {transaction});
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

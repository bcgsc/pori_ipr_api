const THERAPEUTIC_TABLE = 'reports_therapeutic_targets';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return queryInterface.addColumn(THERAPEUTIC_TABLE, 'kb_statement_ids', Sequelize.TEXT, {transaction});
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

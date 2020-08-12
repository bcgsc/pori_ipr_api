const THERAPEUTIC_TABLE = 'reports_therapeutic_targets';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all([
        queryInterface.addColumn(THERAPEUTIC_TABLE, 'kb_statement_id', Sequelize.TEXT, {transaction}),
      ]);
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

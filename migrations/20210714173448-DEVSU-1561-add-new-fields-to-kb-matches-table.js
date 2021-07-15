const KB_MATCHES_TABLE = 'reports_kb_matches';

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all([
        queryInterface.addColumn(KB_MATCHES_TABLE, 'external_source', Sq.TEXT, {transaction}),
        queryInterface.addColumn(KB_MATCHES_TABLE, 'external_statement_id', Sq.TEXT, {transaction}),
      ]);
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

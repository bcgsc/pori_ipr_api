const SIGNATURES_TABLE = 'reports_signatures';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all([
        queryInterface.addColumn(SIGNATURES_TABLE, 'creator_id', Sq.INTEGER, {transaction}),
        queryInterface.addColumn(SIGNATURES_TABLE, 'creator_signed_at', Sq.DATE, {transaction}),
      ]);
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

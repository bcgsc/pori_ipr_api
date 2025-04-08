const GERMLINE_SMALL_VARIANTS_TABLE = 'germline_small_mutations_variant';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all([
        queryInterface.addColumn(GERMLINE_SMALL_VARIANTS_TABLE, 'previously_reported', Sq.TEXT, {transaction}),
      ]);
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

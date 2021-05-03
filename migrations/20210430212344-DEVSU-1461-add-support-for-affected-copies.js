const SMALL_MUTATION_TABLE = 'reports_small_mutations';

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all([
        queryInterface.addColumn(SMALL_MUTATION_TABLE, 'tumour_alt_copies', Sq.INTEGER, {transaction}),
        queryInterface.addColumn(SMALL_MUTATION_TABLE, 'tumour_ref_copies', Sq.INTEGER, {transaction}),
      ]);
    });
  },

  down: () => {
    throw new Error('Not implemented');
  },
};

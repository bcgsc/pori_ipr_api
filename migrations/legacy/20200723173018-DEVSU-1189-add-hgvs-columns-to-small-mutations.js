const SMALL_MUT_TABLE = 'reports_small_mutations';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Add new columns to small mutations table
      return Promise.all([
        queryInterface.addColumn(SMALL_MUT_TABLE, 'hgvs_protein', Sequelize.TEXT, {transaction}),
        queryInterface.addColumn(SMALL_MUT_TABLE, 'hgvs_cds', Sequelize.TEXT, {transaction}),
        queryInterface.addColumn(SMALL_MUT_TABLE, 'hgvs_genomic', Sequelize.TEXT, {transaction}),
      ]);
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

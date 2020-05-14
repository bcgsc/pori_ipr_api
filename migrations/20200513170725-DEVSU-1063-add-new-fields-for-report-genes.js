const GENES_TABLE = 'reports_genes';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // add therapeutic associated column
      await queryInterface.addColumn(GENES_TABLE, 'therapeutic_associated', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }, {transaction});
      // add known small mutation column
      await queryInterface.addColumn(GENES_TABLE, 'known_small_mutation', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }, {transaction});
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

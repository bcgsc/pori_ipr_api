const {addUniqueActiveFieldIndex} = require('../../migrationTools');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all([
        addUniqueActiveFieldIndex(queryInterface, Sequelize, transaction, 'reports_hla_types', ['ident']),
        addUniqueActiveFieldIndex(queryInterface, Sequelize, transaction, 'reports_pairwise_expression_correlation', ['ident']),
      ]);
    });
  },

  down: () => {
    throw Error('not implemented');
  },
};

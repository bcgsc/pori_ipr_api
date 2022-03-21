const PROBE_TEST_INFO_TABLE = 'reports_probe_test_information';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all([
        queryInterface.addColumn(PROBE_TEST_INFO_TABLE, 'cancer_genes', {type: Sq.INTEGER, allowNull: false, defaultValue: -1}, {transaction}),
        queryInterface.addColumn(PROBE_TEST_INFO_TABLE, 'cancer_vars', {type: Sq.INTEGER, allowNull: false, defaultValue: -1}, {transaction}),
      ]);
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

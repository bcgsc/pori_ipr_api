const PROBE_TEST_TABLE = 'reports_probe_test_information';

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all([
        queryInterface.addColumn(PROBE_TEST_TABLE, 'germline_genes', {type: Sq.INTEGER, allowNull: false, defaultValue: -1}, {transaction}),
        queryInterface.addColumn(PROBE_TEST_TABLE, 'germline_vars', {type: Sq.INTEGER, allowNull: false, defaultValue: -1}, {transaction}),
        queryInterface.addColumn(PROBE_TEST_TABLE, 'pharmacogenomic_genes', {type: Sq.INTEGER, allowNull: false, defaultValue: -1}, {transaction}),
        queryInterface.addColumn(PROBE_TEST_TABLE, 'pharmacogenomic_vars', {type: Sq.INTEGER, allowNull: false, defaultValue: -1}, {transaction}),
      ]);
    });
  },

  down: () => {
    throw new Error('Not implemented!');
  },
};

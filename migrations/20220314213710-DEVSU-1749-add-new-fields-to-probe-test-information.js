const PROBE_TEST_INFO_TABLE = 'reports_probe_test_information';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

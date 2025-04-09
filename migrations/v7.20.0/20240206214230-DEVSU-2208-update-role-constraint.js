const TABLE = 'reports_mutation_burden';

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        TABLE,
        'reports_mutation_burden_report_id_role_index',
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

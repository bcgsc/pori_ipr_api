const TABLE = 'reports_tmbur_mutation_burden';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        TABLE,
        'tmb_hidden',
        {
          type: Sq.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

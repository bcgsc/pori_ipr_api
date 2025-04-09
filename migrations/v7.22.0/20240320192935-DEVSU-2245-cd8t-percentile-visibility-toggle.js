const TABLE = 'reports_immune_cell_types';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        TABLE,
        'percentile_hidden',
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

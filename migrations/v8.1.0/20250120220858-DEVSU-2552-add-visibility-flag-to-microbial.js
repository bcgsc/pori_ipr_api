const TABLE = 'reports_summary_microbial';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        TABLE,
        'microbial_hidden',
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

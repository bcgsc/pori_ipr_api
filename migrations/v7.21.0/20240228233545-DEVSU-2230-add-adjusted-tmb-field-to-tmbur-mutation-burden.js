const TABLE = 'reports_tmbur_mutation_burden';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        TABLE,
        'adjusted_tmb',
        {
          type: Sq.FLOAT,
        },
        {transaction},
      );
      await queryInterface.addColumn(
        TABLE,
        'adjusted_tmb_comment',
        {
          type: Sq.TEXT,
        },
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

const TABLE = 'reports_immune_cell_types';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        TABLE,
        'peds_score',
        {
          type: Sq.FLOAT,
          defaultValue: null,
        },
        {transaction},
      );
      await queryInterface.addColumn(
        TABLE,
        'peds_score_comment',
        {
          type: Sq.TEXT,
          defaultValue: null,
        },
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

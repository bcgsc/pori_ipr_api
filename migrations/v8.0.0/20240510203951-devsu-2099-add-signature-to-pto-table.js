const TABLE = 'reports_therapeutic_targets';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        TABLE,
        'signature',
        {
          type: Sq.TEXT,
          defaultValue: null,
        },
        {transaction},
      );
      await queryInterface.addColumn(
        TABLE,
        'signature_graphkb_id',
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

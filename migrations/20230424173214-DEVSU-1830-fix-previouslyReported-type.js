const GERMLINE_VARIANTS = 'germline_small_mutations_variant';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn(
        GERMLINE_VARIANTS,
        'previously_reported',
      );
      await queryInterface.addColumn(
        GERMLINE_VARIANTS,
        'previously_reported',
        {
          type: Sq.ENUM(['yes', 'no']),
          allowNull: true,
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

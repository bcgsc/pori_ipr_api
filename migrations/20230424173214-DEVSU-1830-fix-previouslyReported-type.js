const GERMLINE_VARIANTS = 'germline_small_mutations_variant';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.changeColumns(
        GERMLINE_VARIANTS,
        'previously_reported',
        {
          type: Sq.ENUM(['yes', 'no']),
          defaultValue: 'no',
        },
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

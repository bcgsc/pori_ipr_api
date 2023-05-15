const GERMLINE_VARIANTS = 'germline_small_mutations_variant';

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.changeColumn(
        GERMLINE_VARIANTS,
        'previously_reported',
        {
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

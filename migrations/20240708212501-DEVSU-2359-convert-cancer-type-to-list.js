const TABLE = 'variant_texts';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn(
        TABLE,
        'cancer_type_gkb_id',
        {transaction},
      );

      await queryInterface.removeColumn(
        TABLE,
        'variant_gkb_id',
        {transaction},
      );

      await queryInterface.removeColumn(
        TABLE,
        'cancer_type',
        {transaction},
      );

      await queryInterface.addColumn(
        TABLE,
        'cancer_type',
        {
          type: Sq.ARRAY(Sq.TEXT),
        },
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

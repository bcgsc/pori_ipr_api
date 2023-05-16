const STRUCTURAL_VARIANTS = 'reports_structural_variants';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        STRUCTURAL_VARIANTS,
        'rna_alt_count',
        {
          type: Sq.INTEGER,
        },
        {transaction},
      );
      await queryInterface.addColumn(
        STRUCTURAL_VARIANTS,
        'rna_depth',
        {
          type: Sq.INTEGER,
        },
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

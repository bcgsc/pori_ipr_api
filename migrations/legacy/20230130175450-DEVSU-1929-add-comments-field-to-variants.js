const CNV = 'reports_copy_variants';
const EXP = 'reports_expression_variants';
const PV = 'reports_protein_variants';
const SM = 'reports_small_mutations';
const SV = 'reports_structural_variants';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        CNV,
        'comments',
        {type: Sq.TEXT,
          defaultValue: null},
        {transaction},
      );
      await queryInterface.addColumn(
        EXP,
        'comments',
        {type: Sq.TEXT,
          defaultValue: null},
        {transaction},
      );
      await queryInterface.addColumn(
        PV,
        'comments',
        {type: Sq.TEXT,
          defaultValue: null},
        {transaction},
      );
      await queryInterface.addColumn(
        SM,
        'comments',
        {type: Sq.TEXT,
          defaultValue: null},
        {transaction},
      );
      await queryInterface.addColumn(
        SV,
        'comments',
        {type: Sq.TEXT,
          defaultValue: null},
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

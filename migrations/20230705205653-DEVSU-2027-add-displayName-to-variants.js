const CNV = 'reports_copy_variants';
const EXP = 'reports_expression_variants';
const PV = 'reports_protein_variants';
const SM = 'reports_small_mutations';
const SV = 'reports_structural_variants';
const MSI = 'reports_msi';
const TMB = 'reports_tmbur_mutation_burden';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        CNV,
        'display_name',
        {type: Sq.TEXT,
          defaultValue: null},
        {transaction},
      );
      await queryInterface.addColumn(
        EXP,
        'display_name',
        {type: Sq.TEXT,
          defaultValue: null},
        {transaction},
      );
      await queryInterface.addColumn(
        PV,
        'display_name',
        {type: Sq.TEXT,
          defaultValue: null},
        {transaction},
      );
      await queryInterface.addColumn(
        SM,
        'display_name',
        {type: Sq.TEXT,
          defaultValue: null},
        {transaction},
      );
      await queryInterface.addColumn(
        SV,
        'display_name',
        {type: Sq.TEXT,
          defaultValue: null},
        {transaction},
      );
      await queryInterface.addColumn(
        MSI,
        'display_name',
        {type: Sq.TEXT,
          defaultValue: null},
        {transaction},
      );
      await queryInterface.addColumn(
        TMB,
        'display_name',
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

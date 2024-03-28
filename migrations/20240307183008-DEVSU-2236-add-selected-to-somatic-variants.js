const mutationSignatureTable = 'reports_mutation_signature';
const smallMutationsTable = 'reports_small_mutations';
const structuralVariantsTable = 'reports_structural_variants';
const copyVariantsTable = 'reports_copy_variants';
const expressionVariantsTable = 'reports_expression_variants';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.changeColumn(
        mutationSignatureTable,
        'selected',
        {
          type: Sq.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
        {transaction},
      );
      await queryInterface.addColumn(
        smallMutationsTable,
        'selected',
        {
          type: Sq.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
        {transaction},
      );
      await queryInterface.addColumn(
        structuralVariantsTable,
        'selected',
        {
          type: Sq.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
        {transaction},
      );
      await queryInterface.addColumn(
        copyVariantsTable,
        'selected',
        {
          type: Sq.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
        {transaction},
      );
      await queryInterface.addColumn(
        expressionVariantsTable,
        'selected',
        {
          type: Sq.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

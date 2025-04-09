const VARIANT_TABLES = [
  'reports_copy_variants', 'reports_protein_variants',
  'reports_structural_variants', 'reports_expression_variants',
];

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all(VARIANT_TABLES.map((table) => {
        return queryInterface.addColumn(table, 'germline', Sq.BOOLEAN, {transaction});
      }));
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

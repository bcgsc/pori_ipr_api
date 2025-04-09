module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all([
        // add kbCategory fields to expression-variants and copy-variants
        queryInterface.addColumn('reports_copy_variants', 'kb_category', Sequelize.TEXT, {transaction}),
        queryInterface.addColumn('reports_expression_variants', 'kb_category', Sequelize.TEXT, {transaction}),
        // rename expression_class column to expression_state in the expression-variants table
        queryInterface.renameColumn('reports_expression_variants', 'expression_class', 'expression_state', {transaction}),
      ]);
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

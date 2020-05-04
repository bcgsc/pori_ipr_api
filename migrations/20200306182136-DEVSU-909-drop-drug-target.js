module.exports = {
  up: (queryInterface) => {
    return queryInterface.dropTable('reports_expression_drug_target');
  },

  down: () => {
    throw new Error('Not Implemented');
  },
};

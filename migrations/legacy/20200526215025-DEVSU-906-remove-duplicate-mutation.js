module.exports = {
  up: (queryInterface) => {
    return queryInterface.dropTable('reports_summary_mutation_summary');
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

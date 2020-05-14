module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('reports_structural_variants', 'high_quality', Sequelize.BOOLEAN);
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

module.exports = {
  up: (queryInterface) => {
    return queryInterface.removeColumn('reports_summary_pathway_analysis', 'original');
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

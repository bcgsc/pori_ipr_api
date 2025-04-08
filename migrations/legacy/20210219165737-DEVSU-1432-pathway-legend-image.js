module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.addColumn('reports_summary_pathway_analysis', 'legend', {
      type: Sq.ENUM(['v1', 'v2', 'custom']),
      allowNull: false,
      defaultValue: 'v1',
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

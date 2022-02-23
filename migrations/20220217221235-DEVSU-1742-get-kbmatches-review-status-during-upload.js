module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.addColumn('reports_kb_matches', 'review_status', Sq.TEXT);
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

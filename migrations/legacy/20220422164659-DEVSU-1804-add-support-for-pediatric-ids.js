module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.addColumn('reports', 'pediatric_ids', Sq.TEXT);
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

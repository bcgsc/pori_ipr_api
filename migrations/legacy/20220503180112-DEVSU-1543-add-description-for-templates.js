module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.addColumn('templates', 'description', Sq.TEXT);
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

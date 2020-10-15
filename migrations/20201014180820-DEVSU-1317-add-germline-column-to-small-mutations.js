module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.addColumn('reports_small_mutations', 'germline', {
      type: Sq.BOOLEAN,
    });
  },

  down: () => {
    throw new Error('Not Implemented');
  },
};

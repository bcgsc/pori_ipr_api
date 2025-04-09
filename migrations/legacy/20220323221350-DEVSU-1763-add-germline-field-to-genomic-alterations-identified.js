module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.addColumn('reports_summary_genomic_alterations_identified', 'germline', Sq.BOOLEAN);
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

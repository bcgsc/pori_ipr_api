module.exports = {
  up: (queryInterface) => {
    return queryInterface.dropTable('reports_summary_genomic_events_therapeutic');
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

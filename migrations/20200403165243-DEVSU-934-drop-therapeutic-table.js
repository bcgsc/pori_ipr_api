const PROBE_RESULTS_TABLE = 'reports_probe_results';
const GENOMIC_EVENTS_TABLE = 'reports_summary_genomic_events_therapeutic';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.sequelize.transaction(async (transaction) => {
        // add comments column to probe results table
        await queryInterface.addColumn(PROBE_RESULTS_TABLE, 'comments', Sequelize.TEXT, {transaction});

        // add comments from events table to probe results table
        await queryInterface.sequelize.query(`
          UPDATE ${PROBE_RESULTS_TABLE} AS probe 
          SET comments = events."comments" 
          FROM ${GENOMIC_EVENTS_TABLE} AS events 
          WHERE (probe.gene || ' (' || probe.variant || ')' = events."genomicEvent") and events."comments" != ''
        `, {transaction});

        return queryInterface.dropTable(GENOMIC_EVENTS_TABLE, {transaction});
      });
    } catch (error) {
      throw error;
    }
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

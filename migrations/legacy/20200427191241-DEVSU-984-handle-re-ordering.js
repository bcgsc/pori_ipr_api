const TARGETS_TABLE = 'reports_therapeutic_targets';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Remove old constraint
      await queryInterface.removeIndex(TARGETS_TABLE, 'reports_therapeutic_targets_report_id_type_rank_index', {transaction});
      // Add new constraint
      await queryInterface.sequelize.query(`
        ALTER TABLE ${TARGETS_TABLE} 
          ADD CONSTRAINT reports_therapeutic_targets_report_id_type_rank_constraint 
          EXCLUDE (
            report_id WITH =,
            type WITH =,
            rank WITH =,
            (CASE WHEN deleted_at IS NULL THEN TRUE END) WITH =
          )
          DEFERRABLE INITIALLY DEFERRED
      `, {transaction});
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

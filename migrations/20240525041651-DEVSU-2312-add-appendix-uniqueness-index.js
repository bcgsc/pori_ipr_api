const TABLE = 'templates_appendix';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      queryInterface.addIndex(TABLE, ['template_id', 'project_id'], {
        where: {
          deleted_at: null,
        },
        name: 'templates_appendix_template_project',
        unique: true,
      });
      queryInterface.addIndex(TABLE, ['template_id'], {
        where: {
          deleted_at: null,
          project_id: null,
        },
        name: 'templates_appendix_template_null_project',
        unique: true,
      });
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

// await queryInterface.removeIndex(TARGETS_TABLE, 'reports_therapeutic_targets_report_id_type_rank_index', {transaction});
// Add new constraint
/** await queryInterface.sequelize.query(`
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
*/

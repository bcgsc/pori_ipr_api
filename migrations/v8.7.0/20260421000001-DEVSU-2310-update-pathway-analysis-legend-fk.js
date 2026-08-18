const TABLE = 'reports_summary_pathway_analysis';

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Add the new legend_id column first
      await queryInterface.addColumn(TABLE, 'legend_id', {
        type: Sq.INTEGER,
        references: {
          model: 'pathway_analysis_legends',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        allowNull: true,
      }, {transaction});

      // Datafix: map existing legend values to legend_id using legends table
      await queryInterface.sequelize.query(
        `UPDATE "${TABLE}" SET legend_id = l.id FROM pathway_analysis_legends l WHERE "${TABLE}".legend::text = l.name AND EXISTS (SELECT 1 FROM pathway_analysis_legends);`,
        {transaction},
      );

      // Remove the existing ENUM column
      await queryInterface.removeColumn(TABLE, 'legend', {transaction});

      // Drop the ENUM type created by Sequelize
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_reports_summary_pathway_analysis_legend";',
        {transaction},
      );
    });
  },

  down: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Re-add the original ENUM column
      await queryInterface.addColumn(TABLE, 'legend', {
        type: Sq.ENUM(['v1', 'v2', 'v3', 'custom']),
        allowNull: false,
        defaultValue: 'v3',
      }, {transaction});

      // Datafix: restore legend enum value from linked legend name where possible
      await queryInterface.sequelize.query(
        `UPDATE "${TABLE}" SET legend = l.name::"enum_reports_summary_pathway_analysis_legend" FROM pathway_analysis_legends l WHERE "${TABLE}".legend_id = l.id AND l.name IN ('v1', 'v2', 'v3', 'custom') AND EXISTS (SELECT 1 FROM pathway_analysis_legends);`,
        {transaction},
      );

      // Remove the foreign key column
      await queryInterface.removeColumn(TABLE, 'legend_id', {transaction});
    });
  },
};

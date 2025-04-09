const tables = ['pog_analysis_reports_therapeutic_targets', 'pog_patient_information',
  'pog_analysis_reports_summary_genomic_alterations_identified', 'pog_analysis_reports_summary_analyst_comments',
  'pog_analysis_reports_dga_alterations', 'pog_analysis_reports_summary_tumour_analysis',
  'pog_analysis_reports_summary_pathway_analysis', 'pog_analysis_reports_summary_genomic_events_therapeutic',
  'pog_analysis_reports_copy_number_analysis_cnv', 'pog_analysis_reports_summary_variant_counts',
  'pog_analysis_reports_dga_targeted_genes', 'pog_analysis_reports_expression_drug_target',
  'pog_analysis_reports_expression_outlier', 'pog_analysis_reports_somatic_mutations_mutation_signature',
  'pog_analysis_reports_somatic_mutations_small_mutations', 'pog_analysis_reports_structural_variation_sv',
  'pog_analysis_reports_summary_microbial', 'pog_analysis_reports_summary_mutation',
  'pog_analysis_reports_summary_mutation_summary', 'pog_analysis_reports_summary_probe_target'];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove dataVersions from target tables
    await Promise.all(tables.map((table) => {
      return queryInterface.removeColumn(table, 'dataVersion');
    }));

    console.log('DataVersion columns removed');

    // Remove table pog_analysis_reports_history_tags
    await queryInterface.dropTable('pog_analysis_reports_history_tags');

    // Remove table pog_analysis_reports_history_tags
    console.log('Removed table pog_analysis_reports_history_tags');

    // Remove table pog_analysis_reports_histories
    await queryInterface.dropTable('pog_analysis_reports_histories');

    console.log('Removed table pog_analysis_reports_histories');

    tables.push('pog_analysis_reports_probe_signature');

    // Add not null constarint to ident
    await Promise.all(tables.map((table) => {
      return queryInterface.changeColumn(table, 'ident', {
        type: Sequelize.UUID,
        allowNull: false,
      });
    }));

    console.log('Added not null constraint to ident');

    const uniqConstTables = ['projects', 'users', 'POGs', 'pog_analysis_reports'];

    // Remove unique constraint
    await Promise.all(uniqConstTables.map((table) => {
      return queryInterface.removeConstraint(table, `${table}_ident_key`);
    }));

    // Add unique ident table to list of tables
    uniqConstTables.forEach((table) => {
      tables.push(table);
    });

    // Remove unique name and username constraints
    await queryInterface.removeConstraint('users', 'users_username_key');
    await queryInterface.removeConstraint('projects', 'projects_name_key');

    // Rename properties
    await Promise.all(tables.map((table) => {
      return Promise.all([
        queryInterface.renameColumn(table, 'createdAt', 'created_at'),
        queryInterface.renameColumn(table, 'updatedAt', 'updated_at'),
        queryInterface.renameColumn(table, 'deletedAt', 'deleted_at'),
      ]);
    }));

    console.log('Renamed createdAt, updatedAt, and deletedAt columns');

    // Add ident indexes
    await Promise.all(tables.map((table) => {
      const tableName = table.includes('pog_analysis_reports_') ? table.replace('pog_analysis_reports_', '') : table.replace('pog_', '');
      return queryInterface.addIndex(table, {
        name: `${tableName}_ident_index`,
        unique: true,
        fields: ['ident'],
        where: {
          deleted_at: {
            [Sequelize.Op.eq]: null,
          },
        },
      });
    }));

    console.log('Added ident indexes to tables');

    // Add username/name indexes
    await queryInterface.addIndex('users', {
      name: 'users_username_index',
      unique: true,
      fields: ['username'],
      where: {
        deleted_at: {
          [Sequelize.Op.eq]: null,
        },
      },
    });

    await queryInterface.addIndex('projects', {
      name: 'projects_name_index',
      unique: true,
      fields: ['name'],
      where: {
        deleted_at: {
          [Sequelize.Op.eq]: null,
        },
      },
    });

    console.log('Added username/name indexes');

    return Promise.resolve(true);
  },

  down: async () => {
    return Promise.resolve(true);
  },
};

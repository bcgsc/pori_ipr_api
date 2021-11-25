const TABLES = [
  'germline_small_mutations',
  'germline_small_mutations_review',
  'germline_small_mutations_variant',
  'images',
  'projects',
  'reports',
  'reports_comparators',
  'reports_copy_variants',
  'reports_expression_variants',
  'reports_genes',
  'reports_hla_types',
  'reports_image_data',
  'reports_immune_cell_types',
  'reports_kb_matches',
  'reports_mavis_summary',
  'reports_msi',
  'reports_mutation_burden',
  'reports_mutation_signature',
  'reports_pairwise_expression_correlation',
  'reports_patient_information',
  'reports_presentation_discussion',
  'reports_presentation_slides',
  'reports_probe_results',
  'reports_probe_test_information',
  'reports_protein_variants',
  'reports_signatures',
  'reports_small_mutations',
  'reports_structural_variants',
  'reports_summary_analyst_comments',
  'reports_summary_genomic_alterations_identified',
  'reports_summary_microbial',
  'reports_summary_pathway_analysis',
  'reports_summary_variant_counts',
  'reports_therapeutic_targets',
  'reports_users',
  'templates',
  'user_groups',
  'user_metadata',
  'users',
];

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all(
        TABLES.map((table) => {
          return queryInterface.addColumn(
            table,
            'updated_by',
            {
              type: Sq.INTEGER,
              references: {model: 'users', key: 'id'},
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            {transaction},
          );
        }),
      );
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

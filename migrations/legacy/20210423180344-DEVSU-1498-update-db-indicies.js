const {addUniqueActiveFieldIndex} = require('../../migrationTools/index');

const REPORT_ID_INDEX_TABLES = [
  'reports_copy_variants', 'reports_kb_matches', 'reports_expression_variants',
  'reports_image_data', 'reports_mavis_summary', 'reports_presentation_discussion',
  'reports_presentation_slides', 'reports_signatures', 'reports_probe_test_information',
  'reports_summary_microbial', 'reports_mutation_burden', 'reports_comparators',
  'reports_genes', 'reports_hla_types', 'reports_immune_cell_types', 'reports_msi',
  'reports_mutation_signature', 'reports_pairwise_expression_correlation',
  'reports_patient_information', 'reports_probe_results', 'reports_protein_variants',
  'reports_small_mutations', 'reports_structural_variants', 'reports_summary_analyst_comments',
  'reports_summary_genomic_alterations_identified', 'reports_summary_pathway_analysis',
  'reports_summary_variant_counts', 'reports_therapeutic_targets', 'reports_users',
  'report_projects',
];

const GERMLINE_REPORT_ID_INDEX_TABLES = [
  'germline_reports_to_projects', 'germline_small_mutations_review',
  'germline_small_mutations_variant',
];

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all([
        Promise.all(REPORT_ID_INDEX_TABLES.map((table) => {
          return queryInterface.addIndex(table, {
            name: `${table}_report_id_index`,
            fields: ['report_id'],
            where: {
              deleted_at: {[Sq.Op.eq]: null},
            },
            transaction,
          });
        })),
        Promise.all(GERMLINE_REPORT_ID_INDEX_TABLES.map((table) => {
          return queryInterface.addIndex(table, {
            name: `${table}_germline_report_id_index`,
            fields: ['germline_report_id'],
            where: {
              deleted_at: {[Sq.Op.eq]: null},
            },
            transaction,
          });
        })),
        addUniqueActiveFieldIndex(queryInterface, Sq, transaction, 'user_metadata', ['user_id']),
      ]);
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

// Array of tables to be updated
const tables = [
  'pog_analysis_reports_dga_alterations',
  'pog_analysis_reports_expression_drug_target',
  'pog_analysis_reports_image_data',
  'pog_analysis_reports_presentation_slides',
  'pog_analysis_reports_somatic_mutations_small_mutations',
  'pog_analysis_reports_structural_variation_sv',
  'pog_analysis_reports_summary_pathway_analysis',
  'pog_analysis_reports_probe_results',
  'pog_analysis_reports_summary_variant_counts',
  'pog_analysis_reports_therapeutic_targets',
  'pog_patient_information',
  'pog_analysis_reports_users',
  'pog_analysis_reports_copy_number_analysis_cnv',
  'pog_analysis_reports_expression_outlier',
  'pog_analysis_reports_mavis_summary',
  'pog_analysis_reports_presentation_discussion',
  'pog_analysis_reports_probe_signature',
  'pog_analysis_reports_probe_test_information',
  'pog_analysis_reports_somatic_mutations_mutation_signature',
  'pog_analysis_reports_summary_analyst_comments',
  'pog_analysis_reports_summary_genomic_alterations_identified',
  'pog_analysis_reports_summary_genomic_events_therapeutic',
  'pog_analysis_reports_summary_microbial',
  'pog_analysis_reports_summary_mutation',
  'pog_analysis_reports_summary_mutation_summary',
  'pog_analysis_reports_summary_tumour_analysis',
  'pog_recent_reports',
  'report_projects',
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Delete all reports that have report_id equals null
      await queryInterface.bulkDelete('pog_analysis_reports_users', {report_id: null}, {transaction});
      await Promise.all(tables.map((table) => {
        // Add not null constraint to tables
        return queryInterface.changeColumn(table, 'report_id', {type: Sequelize.INTEGER, allowNull: false}, {transaction});
      }));
      await transaction.commit();
    } catch (err) {
      // If transaction fails rollback and throw an error
      await transaction.rollback();
      throw err;
    }
  },

  down: () => {
    throw new Error('Not Implemented');
  },
};

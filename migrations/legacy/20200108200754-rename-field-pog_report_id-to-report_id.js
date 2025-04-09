const tables = [
  'pog_analysis_reports_users',
  'pog_analysis_reports_copy_number_analysis_cnv',
  'pog_analysis_reports_dga_alterations',
  'pog_analysis_reports_dga_targeted_genes',
  'pog_analysis_reports_expression_drug_target',
  'pog_analysis_reports_expression_outlier',
  'pog_analysis_reports_image_data',
  'pog_analysis_reports_mavis_summary',
  'pog_analysis_reports_presentation_discussion',
  'pog_analysis_reports_presentation_slides',
  'pog_analysis_reports_probe_signature',
  'pog_analysis_reports_probe_test_information',
  'pog_analysis_reports_somatic_mutations_mutation_signature',
  'pog_analysis_reports_somatic_mutations_small_mutations',
  'pog_analysis_reports_structural_variation_sv',
  'pog_analysis_reports_summary_analyst_comments',
  'pog_analysis_reports_summary_genomic_alterations_identified',
  'pog_analysis_reports_summary_genomic_events_therapeutic',
  'pog_analysis_reports_summary_microbial',
  'pog_analysis_reports_summary_mutation',
  'pog_analysis_reports_summary_mutation_summary',
  'pog_analysis_reports_summary_pathway_analysis',
  'pog_analysis_reports_summary_probe_target',
  'pog_analysis_reports_summary_tumour_analysis',
  'pog_analysis_reports_summary_variant_counts',
  'pog_analysis_reports_therapeutic_targets',
  'pog_patient_information',
  'pog_recent_reports',
];

module.exports = {
  up: async (queryInterface) => {
    return Promise.all(tables.map((table) => {
      return queryInterface.renameColumn(table, 'pog_report_id', 'report_id');
    }));
  },

  down: async (queryInterface) => {
    return Promise.all(tables.map((table) => {
      return queryInterface.renameColumn(table, 'report_id', 'pog_report_id');
    }));
  },
};

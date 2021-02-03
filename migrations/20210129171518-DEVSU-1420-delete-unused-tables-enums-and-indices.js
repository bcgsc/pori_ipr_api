const ENUMS_TO_REMOVE = [
  'enum_POG.users_role', 'enum_POGDataHistories_type', 'enum_POGDataHistory_type', 'enum_users_access',
  'enum_dataHistories_type', 'enum_copyNumberAnalysis.cnv_cnvVariant', 'enum_detailedGenomicAnalysis.alterations_report',
  'enum_expression.outlier_outlierType', 'enum_kb_events_status', 'enum_kb_events_type', 'enum_kb_histories_type',
  'enum_kb_references_status', 'enum_kb_references_type', 'enum_pog_analysis_reports_copy_number_analysis_cnv_cnvVariant',
  'enum_pog_analysis_reports_dga_alterations_alterationType', 'enum_pog_analysis_reports_dga_alterations_reportType',
  'enum_pog_analysis_reports_expression_outlier_outlierType', 'enum_pog_analysis_reports_histories_type',
  'enum_pog_analysis_reports_image_data_format', 'enum_pog_analysis_reports_somatic_mutations_small_mutations_mut',
  'enum_pog_analysis_reports_structural_variation_sv_svVariant', 'enum_pog_analysis_reports_summary_genomic_events_therapeutic_re',
  'enum_pog_analysis_reports_therapeutic_targets_type', 'enum_pog_analysis_reports_type', 'enum_pog_analysis_reports_users_role',
  'enum_pog_reports_detailed_dga_report', 'enum_pog_reports_summary_genomic_events_therapeutic_report',
  'enum_structuralVariation.sv_svVariant',
];

module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Remove unused tables
      await queryInterface.dropTable('flash_tokens', {transaction});

      // Remove unused enums
      await Promise.all(ENUMS_TO_REMOVE.map((enumName) => {
        return queryInterface.sequelize.query(`DROP TYPE "${enumName}"`, {transaction});
      }));
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

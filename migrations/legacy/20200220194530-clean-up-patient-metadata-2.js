const {v4: uuidv4} = require('uuid');
// all tables that have a pog_id
// excluding pog_analysis_report which is removed later
// because the pog_id is used in a latter query
const tablesWithPogId = ['pog_analysis_reports_copy_number_analysis_cnv',
  'pog_analysis_reports_dga_alterations', 'pog_analysis_reports_expression_drug_target',
  'pog_analysis_reports_expression_outlier', 'pog_analysis_reports_image_data',
  'pog_analysis_reports_mavis_summary', 'pog_analysis_reports_probe_signature',
  'pog_analysis_reports_probe_test_information', 'pog_analysis_reports_somatic_mutations_mutation_signature',
  'pog_analysis_reports_somatic_mutations_small_mutations', 'pog_analysis_reports_structural_variation_sv',
  'pog_analysis_reports_summary_analyst_comments', 'pog_analysis_reports_summary_genomic_alterations_identified',
  'pog_analysis_reports_summary_genomic_events_therapeutic', 'pog_analysis_reports_summary_mutation',
  'pog_analysis_reports_summary_mutation_summary', 'pog_analysis_reports_summary_pathway_analysis',
  'pog_analysis_reports_summary_tumour_analysis', 'pog_analysis_reports_summary_variant_counts',
  'pog_analysis_reports_users', 'pog_patient_information'];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all report-project mappings, insert mappings into new table,
    // drop all unused tables, remove pog_id and analysis id columns from reports table,
    // add new report columns and insert data into those columns
    await queryInterface.sequelize.transaction(async (transaction) => {
      // insert report-project associations from current pog-project mappings
      await queryInterface.sequelize.query(`
        INSERT INTO report_projects (report_id, project_id, created_at, updated_at) 
          SELECT DISTINCT rep.id AS report_id, proj.project_id, NOW(), NOW() 
          FROM pog_projects AS proj INNER JOIN pog_analysis_reports AS rep 
          ON proj.pog_id = rep.pog_id 
          WHERE proj."deletedAt" IS NULL AND rep.deleted_at IS NULL`, {transaction});

      // add missing ident for Marco Research project
      await queryInterface.bulkUpdate('projects', {ident: uuidv4()}, {ident: null, name: 'Marco_Research'}, {transaction});

      // insert report-project associations not in current pog-project mappings
      await queryInterface.sequelize.query(`
        INSERT INTO report_projects (report_id, project_id, created_at, updated_at) 
          SELECT rep.id, proj.id, pog.created_at, NOW() 
          FROM (
            SELECT id, pog_id, deleted_at FROM pog_analysis_reports 
            WHERE pog_id NOT IN (
              SELECT DISTINCT pog_id 
              FROM pog_projects)) AS rep 
          INNER JOIN "POGs" AS pog ON rep.pog_id = pog.id 
          INNER JOIN projects AS proj ON pog.project = proj.name 
          WHERE rep.deleted_at IS NULL 
          AND pog.deleted_at IS NULL 
          AND proj.deleted_at IS NULL`, {transaction});

      // delete old pog_projects table
      await queryInterface.dropTable('pog_projects', {transaction});

      // delete POGDataExports table
      await queryInterface.dropTable('POGDataExports', {transaction});

      // remove pog_id column from all tables where it is present
      await Promise.all(
        tablesWithPogId.map((table) => {
          return queryInterface.removeColumn(table, 'pog_id', {transaction});
        }),
      );

      // remove subscription table because it isn't used
      await queryInterface.dropTable('pog_analysis_subscription', {transaction});

      // insert new columns into the report table
      await Promise.all([
        queryInterface.addColumn('pog_analysis_reports', 'alternate_identifier', {type: Sequelize.STRING}, {transaction}),
        queryInterface.addColumn('pog_analysis_reports', 'age_of_consent', {type: Sequelize.INTEGER}, {transaction}),
        queryInterface.addColumn('pog_analysis_reports', 'patient_id', {type: Sequelize.STRING}, {transaction}),
        queryInterface.addColumn('pog_analysis_reports', 'biopsy_date', {type: Sequelize.DATE}, {transaction}),
        queryInterface.addColumn('pog_analysis_reports', 'biopsy_name', {type: Sequelize.STRING}, {transaction}),
        queryInterface.addColumn('pog_analysis_reports', 'presentation_date', {type: Sequelize.DATE}, {transaction}),
      ]);

      // transfer pog data to report table
      await queryInterface.sequelize.query(`
        UPDATE pog_analysis_reports AS rep 
        SET (alternate_identifier, age_of_consent, patient_id) = (
          SELECT pog.alternate_identifier, pog.age_of_consent, pog."POGID" 
          FROM "POGs" AS pog 
          WHERE pog.id = rep.pog_id)`, {transaction});

      // transfer analysis data to report table
      await queryInterface.sequelize.query(`
        UPDATE pog_analysis_reports AS rep 
        SET (biopsy_date, biopsy_name, presentation_date) = (
          SELECT biopsy_date, analysis_biopsy, date_presentation 
          FROM pog_analysis AS pa 
          WHERE rep.analysis_id = pa.id)`, {transaction});
    });
  },

  down: () => {
    throw new Error('Not implemented');
  },
};

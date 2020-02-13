const db = require('../app/models');

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

// all tables that have an analysis_id
// excluding pog_analysis which is removed later
// because the analysis_id is used in a latter query
const tablesWithAnalysisId = ['pog_analysis_germline_small_mutations'];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1st transaction: Create report_project table
    try {
      await queryInterface.sequelize.transaction(async (transaction) => {
        await queryInterface.createTable('report_projects',
          {...db.models.report_project.rawAttributes}, {transaction}, db.models.report_project);
      });
    } catch (error) {
      throw error;
    }

    // 2nd transaction: get all report-project mappings, insert mappings into new table,
    // drop all unused tables, remove pog_id and analysis id columns from reports table,
    // add new report columns and insert data into those columns
    try {
      await queryInterface.sequelize.transaction(async (transaction) => {
        // get current report-project mappings
        const reportProjectInsert = 'SELECT DISTINCT rep.id AS report_id, proj.project_id FROM pog_projects AS proj INNER JOIN pog_analysis_reports AS rep ON proj.pog_id = rep.pog_id WHERE proj."deletedAt" IS NULL AND rep.deleted_at IS NULL';
        const [records] = await queryInterface.sequelize.query(reportProjectInsert, {transaction});

        // insert records into new report_project table
        await db.models.report_project.bulkCreate(records);

        // delete old pog_projects table
        await queryInterface.dropTable('pog_projects', {transaction});

        // delete POGDataExports table
        await queryInterface.dropTable('POGDataExports', {transaction});

        // remove pog_id column from all tables where it is present
        await Promise.all(
          tablesWithPogId.map((table) => {
            return queryInterface.removeColumn(table, 'pog_id', {transaction});
          })
        );

        // remove subscription table because it isn't used
        await queryInterface.dropTable('pog_analysis_subscription', {transaction});

        // remove analysis_id column from all tables where it is present
        await Promise.all(
          tablesWithAnalysisId.map((table) => {
            return queryInterface.removeColumn(table, 'pog_analysis_id', {transaction});
          })
        );

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
        const transferNewColumnPogDataQuery = 'UPDATE pog_analysis_reports AS rep SET (alternate_identifier, age_of_consent, patient_id) = (SELECT pog.alternate_identifier, pog.age_of_consent, pog."POGID" FROM "POGs" AS pog WHERE pog.id = rep.pog_id)';
        await queryInterface.sequelize.query(transferNewColumnPogDataQuery, {transaction});

        // transfer analysis data to report table
        const transferNewColumnAnalysisDataQuery = 'UPDATE pog_analysis_reports AS rep SET (biopsy_date, biopsy_name, presentation_date) = (SELECT biopsy_date, analysis_biopsy, date_presentation FROM pog_analysis AS pa WHERE rep.analysis_id = pa.id)';
        await queryInterface.sequelize.query(transferNewColumnAnalysisDataQuery, {transaction});
      });
    } catch (error) {
      throw error;
    }

    // 3rd transaction: Add column constraints, remove report foreign keys, drop tables
    try {
      await queryInterface.sequelize.transaction(async (transaction) => {
        // add patient_id column constraints
        await queryInterface.changeColumn('pog_analysis_reports', 'patient_id', {
          type: Sequelize.STRING,
          unique: false,
          allowNull: false,
        }, {transaction});

        // drop view because it references the pog_id column on pog_analysis_reports
        // and won't allow me to drop the column on that table
        await queryInterface.sequelize.query('DROP VIEW pog_report_meta', {transaction});

        // after data has been added, remove pog_id and analysis_id columns
        await Promise.all([
          queryInterface.removeColumn('pog_analysis_reports', 'pog_id', {transaction}),
          queryInterface.removeColumn('pog_analysis_reports', 'analysis_id', {transaction}),
        ]);

        // finally delete the POGs and pog_analysis tables
        return Promise.all([
          await queryInterface.dropTable('pog_analysis', {transaction}),
          await queryInterface.dropTable('POGs', {transaction}),
        ]);
      });
      return Promise.resolve();
    } catch (error) {
      throw error;
    }
  },

  down: () => {
    throw new Error('Not Implemented');
  },
};

const Sq = require('sequelize');
const nconf = require('../app/config');
const logger = require('../app/log');
// Load logging library
const dbSettings = nconf.get('database');

logger.info(`setting connection to database ${dbSettings.name}(${dbSettings.hostname}):${dbSettings.port} as ${dbSettings.username}`);

if (['ipr', 'ipr-sync-dev', 'ipr-sync-staging'].includes(dbSettings.name)) {
  throw Error(`Cannot clean one of the main DBs (${dbSettings.name}), please make a temporary copy instead`);
}

const sequelize = new Sq(
  dbSettings.name,
  dbSettings.username,
  dbSettings.password,
  {
    host: dbSettings.hostname,
    dialect: dbSettings.engine,
    port: dbSettings.port,
    schema: dbSettings.schema,
    logging: null,
  }
);


const REPORT_TABLES = [
  'report_projects',
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
];

const TRUNCATE_TABLES = [
  'germline_reports_to_projects',
  'germline_small_mutations',
  'germline_small_mutations_review',
  'germline_small_mutations_variant',
];

const checkReportsCount = async (queryInterface, transaction, minReports = 3) => {
  const [{count: reportCount}] = await queryInterface.sequelize.query(
    'SELECT count(*) FROM REPORTS',
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );
  if (reportCount < minReports) {
    throw new Error(
      `failed to keep the min number (${minReports}) of target reports: ${reportCount}`
    );
  }
};

const cleanDb = async () => {
  const queryInterface = sequelize.getQueryInterface();

  return queryInterface.sequelize.transaction(async (transaction) => {
    // get the PORI project
    const reportsToKeep = (await queryInterface.sequelize.query(
      `SELECT id from reports r
        WHERE exists (
          SELECT * FROM report_projects rp
          JOIN projects p ON (p.id = rp.project_id)
          WHERE p.name = :name
            AND r.id = rp.report_id
            ) AND deleted_at IS NULL`,
      {
        transaction,
        type: queryInterface.sequelize.QueryTypes.SELECT,
        replacements: {name: 'PORI'},
      }
    )).map((r) => { return r.id; });
    console.log('reports to keep', reportsToKeep.length);

    await queryInterface.sequelize.query(
      'DELETE FROM reports WHERE NOT (id IN (:reportsToKeep))',
      {
        transaction,
        replacements: {
          reportsToKeep,
        },
      }
    );

    for (const tablename of REPORT_TABLES) {
      console.log(`deleting from ${tablename}`);
      await queryInterface.sequelize.query(
        `DELETE FROM ${tablename} WHERE NOT (report_id IN (:reportsToKeep))`,
        {
          transaction,
          replacements: {
            reportsToKeep,
          },
        }
      );
    }
    await checkReportsCount(queryInterface, transaction);
    for (const tableName of TRUNCATE_TABLES) {
      console.log(`truncating ${tableName}`);
      await queryInterface.sequelize.query(`TRUNCATE TABLE ${tableName} CASCADE`, {transaction});
    }
    console.log('DROP all non-admin non-manager groups');
    await queryInterface.sequelize.query(
      `DELETE FROM user_groups
        WHERE deleted_at IS NOT NULL OR NOT (name in (:groups))`,
      {transaction, replacements: {groups: ['admin', 'manager', 'reviewer']}}
    );

    console.log('DROP ALL non-PORI projects');
    await queryInterface.sequelize.query(
      `DELETE FROM projects
        WHERE deleted_at IS NOT NULL OR NOT (name in (:projects))`,
      {transaction, replacements: {projects: ['PORI']}}
    );

    await queryInterface.sequelize.query(
      'UPDATE reports SET "createdBy_id" = NULL',
      {transaction}
    );
    await checkReportsCount(queryInterface, transaction);
    console.log('create the demo user if not exists');
    let [demoUser] = await queryInterface.sequelize.query(
      'SELECT * FROM users where username = :username AND deleted_at IS NULL',
      {
        transaction,
        type: queryInterface.sequelize.QueryTypes.SELECT,
        replacements: {
          username: 'iprdemo',
          firstName: 'ipr',
          lastName: 'demo',
          type: 'bcgsc',
          email: 'iprdemo@bcgsc.ca',
        },
      }
    );
    if (!demoUser) {
      [[demoUser]] = await queryInterface.sequelize.query(
        `INSERT INTO users (
          ident, username, password, type,
          "firstName", "lastName", "email",
          created_at, deleted_at, updated_at
        ) values (
          uuid_generate_v4(), :username, '', :type,
          :firstName, :lastName, :email,
          NOW(), NULL, NOW()
        ) RETURNING id`,
        {
          transaction,
          replacements: {
            username: 'iprdemo',
            firstName: 'ipr',
            lastName: 'demo',
            type: 'bcgsc',
            email: 'iprdemo@bcgsc.ca',
          },
        }
      );
      console.log('created', demoUser);
    }
    console.log('make iprdemo user the group owner of all groups');
    await queryInterface.sequelize.query(
      'UPDATE user_groups SET owner_id = :owner',
      {transaction, replacements: {owner: demoUser.id}}
    );
    console.log('drop all other users');
    await queryInterface.sequelize.query(
      'DELETE FROM users WHERE username != :username',
      {transaction, replacements: {username: 'iprdemo'}}
    );

    await checkReportsCount(queryInterface, transaction);

    // anonymize reports_pairwise_expression_correlation patient id data
    const correlations = await queryInterface.sequelize.query(
      'SELECT patient_id, library, ident from reports_pairwise_expression_correlation',
      {transaction, type: queryInterface.sequelize.QueryTypes.SELECT}
    );
      // sort by ident to avoid chronological ordering
    correlations.sort((a, b) => { return a.ident.localeCompare(b.ident); });

    for (let i = 0; i < correlations.length; i++) {
      const corr = correlations[i];
      await queryInterface.sequelize.query(
        `UPDATE reports_pairwise_expression_correlation
          SET patientId = :newPatientId, library = :newLibrary
          WHERE patientId = :patientId
            AND library = :library`,
        {
          transaction,
          replacements: {
            patientId: corr.patient_id,
            library: corr.library,
            newPatientId: `PATIENT${i}`,
            newLibrary: `LIB00${i}`,
          },
        }
      );
    }

    // anonymize reports patient id data
    const reports = await queryInterface.sequelize.query(
      `SELECT DISTINCT ON (patient_id) patient_id, ident
        FROM reports
        WHERE patient_id NOT LIKE :tcgaPattern
        ORDER BY patient_id`,
      {
        transaction,
        type: queryInterface.sequelize.QueryTypes.SELECT,
        replacements: {tcgaPattern: 'TCGA-%'},
      }
    );
      // sort by ident to avoid chronological ordering
    reports.sort((a, b) => { return a.ident.localeCompare(b.ident); });

    for (let i = 0; i < reports.length; i++) {
      await queryInterface.sequelize.query(
        `UPDATE reports
          SET patient_id = :newPatientId
          WHERE patient_id = :patientId`,
        {
          transaction,
          replacements: {
            patientId: reports[i].patient_id,
            newPatientId: `PATIENT${i}`,
          },
        }
      );
    }

    // remove JSON fields with sample/POG names
    await queryInterface.sequelize.query(
      `UPDATE reports
        SET config = '',
          age_of_consent = NULL,
          "sampleInfo" = NULL,
          "seqQC" = NULL,
          biopsy_date = NULL`,
      {
        transaction,
      }
    );

    // anonymize clinician and age in patient information table
    await queryInterface.sequelize.query(
      `UPDATE reports_patient_information
        SET age = NULL, physician = :physician, "reportDate" = NULL`,
      {
        transaction,
        replacements: {physician: 'Dr. Anonymous'},
      }
    );
  });
};
cleanDb()
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });

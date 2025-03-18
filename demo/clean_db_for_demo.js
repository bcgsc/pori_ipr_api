const Sq = require('sequelize');
const {v4: uuidv4} = require('uuid');
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
  },
);

const TRUNCATE_TABLES = [
  'germline_reports_to_projects',
  'germline_small_mutations',
  'germline_small_mutations_review',
  'germline_small_mutations_variant',
  'notifications',
];

const checkReportsCount = async (queryInterface, transaction, minReports = 3) => {
  const [{count: reportCount}] = await queryInterface.sequelize.query(
    'SELECT count(*) FROM REPORTS',
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
    },
  );
  if (reportCount < minReports) {
    throw new Error(
      `failed to keep the min number (${minReports}) of target reports: ${reportCount}`,
    );
  }
};

const addDemoUserToGroup = async (queryInterface, transaction, demoUser, groupName) => {
  //  group id
  const [group] = await queryInterface.sequelize.query(
    'SELECT * FROM user_groups WHERE deleted_at IS NULL AND name = :name',
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
      replacements: {
        name: groupName,
      },
    },
  );

  const [isMember] = await queryInterface.sequelize.query(
    'SELECT * FROM user_group_members where user_id = :userId AND deleted_at IS NULL AND group_id = :groupId',
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
      replacements: {
        userId: demoUser.id,
        groupId: group.id,
      },
    },
  );

  if (!isMember) {
    // add the demo user to admin group
    await queryInterface.sequelize.query(
      `INSERT INTO user_group_members (
        user_id, group_id,
        created_at, deleted_at, updated_at
      ) values (
        :userId, :groupId,
        NOW(), NULL, NOW()
      )`,
      {
        transaction,
        replacements: {
          userId: demoUser.id,
          groupId: group.id,
        },
      },
    );
  }
};

const addDemoUserToProject = async (queryInterface, transaction, demoUser, projectName) => {
  let [project] = await queryInterface.sequelize.query(
    'SELECT * FROM projects WHERE deleted_at IS NULL AND name = :name',
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
      replacements: {
        name: projectName,
      },
    },
  );

  if (!project) {
    // create the project if it doesn't exist
    [[project]] = await queryInterface.sequelize.query(
      `INSERT INTO projects (
        ident, name,
        created_at, deleted_at, updated_at
      ) values (
        :uuid, :projectName,
        NOW(), NULL, NOW()
      ) RETURNING ID`,
      {
        transaction,
        replacements: {
          projectName, uuid: uuidv4(),
        },
      },
    );
  }

  const [isMember] = await queryInterface.sequelize.query(
    'SELECT * FROM user_projects where user_id = :userId AND deleted_at IS NULL AND project_id = :projectId',
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
      replacements: {
        userId: demoUser.id,
        projectId: project.id,
      },
    },
  );

  if (!isMember) {
    // add the demo user to admin group
    await queryInterface.sequelize.query(
      `INSERT INTO user_projects (
        user_id, project_id,
        created_at, deleted_at, updated_at
      ) values (
        :userId, :projectId,
        NOW(), NULL, NOW()
      )`,
      {
        transaction,
        replacements: {
          userId: demoUser.id,
          projectId: project.id,
        },
      },
    );
  }
};

const cleanUsers = async (queryInterface, transaction, reportsToKeep) => {
  console.log('DROP all reports_signatures');
  await queryInterface.sequelize.query(
    'TRUNCATE reports_signatures',
    {transaction},
  );

  console.log('set templates_appendix users to null');
  await queryInterface.sequelize.query(
    'UPDATE templates_appendix SET "updated_by" = NULL',
    {transaction},
  );

  console.log('set templates users to null');
  await queryInterface.sequelize.query(
    'UPDATE templates SET "updated_by" = NULL',
    {transaction},
  );

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
    },
  );
  if (!demoUser) {
    [[demoUser]] = await queryInterface.sequelize.query(
      `INSERT INTO users (
        ident, username, password, type,
        "firstName", "lastName", "email",
        created_at, deleted_at, updated_at
      ) values (
        :uuid, :username, '', :type,
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
          uuid: uuidv4(),
        },
      },
    );
    console.log('created', demoUser);
  }

  console.log('create the demo user metadata if not exists');

  const [userMetadata] = await queryInterface.sequelize.query(
    'SELECT * FROM user_metadata where id = :id AND deleted_at IS NULL',
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
      replacements: {
        id: demoUser.id,
      },
    },
  );
  console.log(demoUser.id);
  console.log(userMetadata);
  if (!userMetadata) {
    await queryInterface.sequelize.query(
      `INSERT INTO user_metadata (
        ident, user_id,
        created_at, updated_at
      ) values (
        :uuid, :id,
        NOW(), NOW()
      )`,
      {
        transaction,
        replacements: {
          uuid: uuidv4(),
          id: demoUser.id,
        },
      },
    );
  }

  await addDemoUserToGroup(queryInterface, transaction, demoUser, 'admin');
  await addDemoUserToGroup(queryInterface, transaction, demoUser, 'manager');
  await addDemoUserToProject(queryInterface, transaction, demoUser, 'PORI');
  await addDemoUserToProject(queryInterface, transaction, demoUser, 'TEST');
  console.log('drop all other users');
  await queryInterface.sequelize.query(
    `UPDATE reports_therapeutic_targets set updated_by = :demouser WHERE updated_by is not null
      and (report_id IN(:reportsToKeep));
      UPDATE reports_summary_analyst_comments set updated_by = :demouser WHERE updated_by is not null
      and (report_id IN(:reportsToKeep));
      UPDATE reports_mutation_signature set updated_by = :demouser WHERE updated_by is not null
      and (report_id IN(:reportsToKeep));
      DELETE FROM users WHERE username != :username;`,
    {transaction, replacements: {username: 'iprdemo', demouser: demoUser.id, reportsToKeep}},
  );

  console.log('create the admin user if not exists');
  let [adminUser] = await queryInterface.sequelize.query(
    'SELECT * FROM users where username = :username AND deleted_at IS NULL',
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
      replacements: {
        username: 'ipr-bamboo-admin',
        firstName: 'ipr-bamboo-admin',
        lastName: 'ipr-bamboo-admin',
        type: 'bcgsc',
        email: 'ipr@bcgsc.ca',
      },
    },
  );
  if (!adminUser) {
    [[adminUser]] = await queryInterface.sequelize.query(
      `INSERT INTO users (
        ident, username, password, type,
        "firstName", "lastName", "email",
        created_at, deleted_at, updated_at
      ) values (
        :uuid, :username, '', :type,
        :firstName, :lastName, :email,
        NOW(), NULL, NOW()
      ) RETURNING id`,
      {
        transaction,
        replacements: {
          username: 'ipr-bamboo-admin',
          firstName: 'ipr-bamboo-admin',
          lastName: 'ipr-bamboo-admin',
          type: 'bcgsc',
          email: 'ipr@bcgsc.ca',
          uuid: uuidv4(),
        },
      },
    );
    console.log('created', adminUser);
  }

  console.log('create the demo user metadata if not exists');

  const [adminUserMetadata] = await queryInterface.sequelize.query(
    'SELECT * FROM user_metadata where id = :id AND deleted_at IS NULL',
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
      replacements: {
        id: adminUser.id,
      },
    },
  );
  console.log(adminUser.id);
  console.log(adminUserMetadata);
  if (!adminUserMetadata) {
    await queryInterface.sequelize.query(
      `INSERT INTO user_metadata (
        ident, user_id,
        created_at, updated_at
      ) values (
        :uuid, :id,
        NOW(), NOW()
      )`,
      {
        transaction,
        replacements: {
          uuid: uuidv4(),
          id: adminUser.id,
        },
      },
    );
  }

  await addDemoUserToGroup(queryInterface, transaction, adminUser, 'admin');
  await addDemoUserToGroup(queryInterface, transaction, adminUser, 'manager');
  await addDemoUserToProject(queryInterface, transaction, adminUser, 'PORI');
  await addDemoUserToProject(queryInterface, transaction, adminUser, 'TEST');

  console.log('DROP all user_projects where user has been deleted');
  await queryInterface.sequelize.query(
    `DELETE FROM user_projects WHERE user_id not in (select id from users);
    DELETE FROM user_metadata WHERE user_id not in (select id from users);
    DELETE FROM user_group_members WHERE user_id not in (select id from users);`,
    {transaction},
  );
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
      },
    )).map((r) => {
      return r.id;
    });
    console.log('reports to keep', reportsToKeep.length);
    console.log('reports to keep', reportsToKeep);

    await queryInterface.sequelize.query(
      'DELETE FROM reports WHERE id NOT IN(:reportsId)',
      {
        transaction,
        replacements: {
          reportsId: reportsToKeep,
        },
      },
    );

    const reportTables = (await queryInterface.sequelize.query(
      'SELECT table_name FROM information_schema.tables WHERE table_name LIKE :reportTablePattern;',
      {
        transaction,
        type: queryInterface.sequelize.QueryTypes.SELECT,
        replacements: {reportTablePattern: 'reports\\_%'},
      },
    )).flat();
    reportTables.push('report_projects'); // does not follow pattern

    for (const tablename of reportTables) {
      console.log(`deleting from ${tablename}`);
      if (tablename === 'reports_kb_match_join') {
        continue;
      }
      await queryInterface.sequelize.query(
        `DELETE FROM ${tablename} WHERE report_id NOT IN(:reportsId)`,
        {
          transaction,
          replacements: {
            reportsId: reportsToKeep,
          },
        },
      );
    }

    await queryInterface.sequelize.query(
      'DELETE FROM reports_kb_match_join WHERE NOT (kb_match_id IN (select id from reports_kb_matches))',
      {
        transaction,
      },
    );

    await checkReportsCount(queryInterface, transaction, reportsToKeep.length);
    for (const tableName of TRUNCATE_TABLES) {
      console.log(`truncating ${tableName}`);
      await queryInterface.sequelize.query(`TRUNCATE TABLE ${tableName} CASCADE`, {transaction});
    }

    console.log('DROP ALL non-PORI projects');
    await queryInterface.sequelize.query(
      `DELETE FROM projects
        WHERE deleted_at IS NOT NULL OR NOT (name in (:projects))`,
      {transaction, replacements: {projects: ['PORI', 'TEST']}},
    );

    await queryInterface.sequelize.query(
      'UPDATE reports SET "createdBy_id" = NULL',
      {transaction},
    );

    await checkReportsCount(queryInterface, transaction, reportsToKeep.length);

    await cleanUsers(queryInterface, transaction, reportsToKeep);
    await checkReportsCount(queryInterface, transaction, reportsToKeep.length);

    console.log('anonymize reports_pairwise_expression_correlation patient id data');
    const correlations = await queryInterface.sequelize.query(
      'SELECT patient_id, library, ident from reports_pairwise_expression_correlation',
      {transaction, type: queryInterface.sequelize.QueryTypes.SELECT},
    );
    // sort by ident to avoid chronological ordering
    correlations.sort((a, b) => {
      return a.ident.localeCompare(b.ident);
    });

    for (let i = 0; i < correlations.length; i++) {
      const corr = correlations[i];
      await queryInterface.sequelize.query(
        `UPDATE reports_pairwise_expression_correlation
          SET patient_id = :newPatientId, library = :newLibrary
          WHERE patient_id = :patientId
            AND library = :library`,
        {
          transaction,
          replacements: {
            patientId: corr.patient_id,
            library: corr.library,
            newPatientId: `PATIENT${i}`,
            newLibrary: `LIB00${i}`,
          },
        },
      );
    }

    console.log('anonymize reports patient id data');
    const nonTcgaPatients = await queryInterface.sequelize.query(
      `SELECT DISTINCT ON (patient_id) patient_id, ident
        FROM reports
        WHERE patient_id NOT LIKE :tcgaPattern
        ORDER BY patient_id`,
      {
        transaction,
        type: queryInterface.sequelize.QueryTypes.SELECT,
        replacements: {tcgaPattern: 'TCGA-%'},
      },
    );
    // sort by ident to avoid chronological ordering
    nonTcgaPatients.sort((a, b) => {
      return a.ident.localeCompare(b.ident);
    });

    for (let i = 0; i < nonTcgaPatients.length; i++) {
      await queryInterface.sequelize.query(
        `UPDATE reports
          SET patient_id = :newPatientId
          WHERE patient_id = :patientId`,
        {
          transaction,
          replacements: {
            patientId: nonTcgaPatients[i].patient_id,
            newPatientId: `PATIENT${i}`,
          },
        },
      );
    }

    console.log('remove JSON fields containing sample/patient names/ids');
    await queryInterface.sequelize.query(
      `UPDATE reports
        SET config = '',
          age_of_consent = NULL,
          "seqQC" = NULL,
          biopsy_date = NULL`,
      {
        transaction,
      },
    );

    console.log('anonymize clinician and age in patient information table');
    await queryInterface.sequelize.query(
      `UPDATE reports_patient_information
        SET age = NULL, physician = :physician, "reportDate" = NULL`,
      {
        transaction,
        replacements: {physician: 'REDACTED'},
      },
    );

    const reportImagesNameList = (await queryInterface.sequelize.query(
      `SELECT ri.id, filename, report_id, patient_id from reports_image_data ri
      join reports r on report_id = r.id`,
      {
        transaction,
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    ));

    for (const reportImage of reportImagesNameList) {
      console.log(`anonymizing ${reportImage.filename}`);
      const newFilename = reportImage.filename.replace(/POG(\d+)_P0(\d+)_P0(\d+)/, reportImage.patient_id);
      console.log(newFilename);
      await queryInterface.sequelize.query(
        `UPDATE reports_image_data
        SET filename = :newStr
        WHERE id = :image_id`,
        {
          transaction,
          replacements: {
            newStr: newFilename,
            image_id: reportImage.id,
          },
        },
      );
    }
  });
};
cleanDb()
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });

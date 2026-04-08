const Sq = require('sequelize');
const {v4: uuidv4} = require('uuid');
const nconf = require('../app/config');
const logger = require('../app/log');
const modelsSequelize = require('../app/models');
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

const normalizeTableName = (tableReference) => {
  if (typeof tableReference === 'string') {
    return tableReference;
  }
  if (!tableReference || !tableReference.tableName) {
    return null;
  }
  if (tableReference.schema && tableReference.schema !== dbSettings.schema) {
    return null;
  }
  return tableReference.tableName;
};

const expectedTableNames = new Set([
  'SequelizeMeta',
  ...Object.values(modelsSequelize.models)
    .map((model) => normalizeTableName(model.getTableName()))
    .filter(Boolean),
]);

modelsSequelize.close()
  .catch((err) => {
    logger.error(err);
  });

const clearImagesTable = async (queryInterface, transaction) => {
  console.log('remove all records from the images table and reports-image-data table');
  await queryInterface.sequelize.query(
    `UPDATE templates
      SET logo_id = NULL,
          header_id = NULL,
          updated_at = NOW()
      WHERE logo_id IS NOT NULL
         OR header_id IS NOT NULL`,
    {
      transaction,
    },
  );
  await queryInterface.sequelize.query(
    'DELETE FROM reports_image_data',
    {
      transaction,
    },
  );
  await queryInterface.sequelize.query(
    'DELETE FROM images',
    {
      transaction,
    },
  );
};

const clearVariantTextsTable = async (queryInterface, transaction) => {
  console.log('remove variant_texts records not associated with project TEST');
  await queryInterface.sequelize.query(
    `DELETE FROM variant_texts
      WHERE project_id IS NULL
         OR project_id NOT IN (
           SELECT id
           FROM projects
           WHERE deleted_at IS NULL
             AND name = 'TEST'
         )`,
    {
      transaction,
    },
  );
  await queryInterface.sequelize.query(
    `UPDATE variant_texts
      SET updated_by = (
            SELECT id
            FROM users
            WHERE username = 'iprdemo'
              AND deleted_at IS NULL
            LIMIT 1
          ),
          updated_at = NOW()
      WHERE updated_by IS NOT NULL
        AND updated_by NOT IN (
          SELECT id
          FROM users
        )`,
    {
      transaction,
    },
  );
};

const clearUserMetadataTable = async (queryInterface, transaction) => {
  console.log('truncate the user_metadata table');
  await queryInterface.sequelize.query(
    'TRUNCATE TABLE user_metadata',
    {
      transaction,
    },
  );
};

const dropUnexpectedTables = async (queryInterface, transaction) => {
  console.log('drop tables not defined in sequelize models');
  const tables = await queryInterface.sequelize.query(
    `SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = :schema
        AND table_type = 'BASE TABLE'`,
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
      replacements: {
        schema: dbSettings.schema,
      },
    },
  );

  const unexpectedTables = tables
    .map(({table_name: tableName}) => tableName)
    .filter((tableName) => !expectedTableNames.has(tableName));

  for (const tableName of unexpectedTables) {
    console.log(`drop unexpected table ${tableName}`);
    await queryInterface.sequelize.query(
      `DROP TABLE IF EXISTS ${queryInterface.quoteTable({schema: dbSettings.schema, tableName})} CASCADE`,
      {
        transaction,
      },
    );
  }
};

const resetOwnedSequences = async (queryInterface, transaction) => {
  console.log('reset all owned sequences to the next available value');
  await queryInterface.sequelize.query(
    `DO $$
    DECLARE
      sequence_record RECORD;
    BEGIN
      FOR sequence_record IN
        SELECT
          sequence_namespace.nspname AS sequence_schema,
          sequence_class.relname AS sequence_name,
          table_namespace.nspname AS table_schema,
          table_class.relname AS table_name,
          attribute.attname AS column_name
        FROM pg_class AS sequence_class
        JOIN pg_namespace AS sequence_namespace
          ON sequence_namespace.oid = sequence_class.relnamespace
        JOIN pg_depend AS dependency
          ON dependency.objid = sequence_class.oid
         AND dependency.deptype = 'a'
        JOIN pg_class AS table_class
          ON table_class.oid = dependency.refobjid
        JOIN pg_namespace AS table_namespace
          ON table_namespace.oid = table_class.relnamespace
        JOIN pg_attribute AS attribute
          ON attribute.attrelid = table_class.oid
         AND attribute.attnum = dependency.refobjsubid
        WHERE sequence_class.relkind = 'S'
      LOOP
        EXECUTE format(
          'SELECT setval(%L, COALESCE(MAX(%I), 1), MAX(%I) IS NOT NULL) FROM %I.%I',
          format('%I.%I', sequence_record.sequence_schema, sequence_record.sequence_name),
          sequence_record.column_name,
          sequence_record.column_name,
          sequence_record.table_schema,
          sequence_record.table_name
        );
      END LOOP;
    END $$;`,
    {
      transaction,
    },
  );
};

const addPoriAdminUser = async (queryInterface, transaction) => {
  console.log('ensure the pori_admin user and related records exist');
  const poriAdmin = await queryInterface.sequelize.query(
    `SELECT id
      FROM users
      WHERE username = :username
      ORDER BY deleted_at IS NULL DESC, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
      LIMIT 1`,
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
      replacements: {
        username: 'pori_admin',
      },
    },
  ).then(([user]) => user);

  const ensuredPoriAdmin = poriAdmin || await queryInterface.sequelize.query(
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
        username: 'pori_admin',
        firstName: 'pori_admin',
        lastName: 'pori_admin',
        type: 'bcgsc',
        email: 'change@me.ca',
        uuid: uuidv4(),
      },
    },
  ).then(([[user]]) => user);

  if (poriAdmin) {
    console.log('found existing pori_admin user', poriAdmin);
  } else {
    console.log('created pori_admin user', ensuredPoriAdmin);
  }

  const userMetadata = await queryInterface.sequelize.query(
    `SELECT id
      FROM user_metadata
      WHERE user_id = :id
      LIMIT 1`,
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
      replacements: {
        id: ensuredPoriAdmin.id,
      },
    },
  ).then(([metadata]) => metadata);

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
          id: ensuredPoriAdmin.id,
        },
      },
    );
  }

  const [group] = await queryInterface.sequelize.query(
    'SELECT * FROM user_groups WHERE deleted_at IS NULL AND name = :name',
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
      replacements: {
        name: 'admin',
      },
    },
  );

  const groupMembership = await queryInterface.sequelize.query(
    `SELECT id
      FROM user_group_members
      WHERE user_id = :userId
        AND group_id = :groupId
        AND deleted_at IS NULL
      LIMIT 1`,
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
      replacements: {
        userId: ensuredPoriAdmin.id,
        groupId: group.id,
      },
    },
  ).then(([membership]) => membership);

  if (!groupMembership) {
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
          userId: ensuredPoriAdmin.id,
          groupId: group.id,
        },
      },
    );
  }
};

const vacuumFullDb = async () => {
  console.log('run VACUUM FULL on the database');
  await sequelize.query('VACUUM FULL');
};

const cleanDb = async () => {
  const queryInterface = sequelize.getQueryInterface();
  return queryInterface.sequelize.transaction(async (transaction) => {
    await clearImagesTable(queryInterface, transaction);
    await clearVariantTextsTable(queryInterface, transaction);
    await clearUserMetadataTable(queryInterface, transaction);
    await dropUnexpectedTables(queryInterface, transaction);
    await resetOwnedSequences(queryInterface, transaction);
    await addPoriAdminUser(queryInterface, transaction);
  });
};
cleanDb()
  .then(() => vacuumFullDb())
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  })
  .finally(() => sequelize.close()
    .catch((err) => {
      logger.error(err);
    }));

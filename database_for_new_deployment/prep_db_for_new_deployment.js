const Sq = require('sequelize');
const {v4: uuidv4} = require('uuid');
const nconf = require('../../app/config');
const logger = require('../../app/log');
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


// TODO - keep all users needed for deployment - pori_admin
const addPoriAdminUser = async (queryInterface, transaction) => {
  console.log('create the pori_admin user. we assume the user does not already exist');
  const [[poriAdmin]] = await queryInterface.sequelize.query(
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
  );
  console.log('created', poriAdmin);

  console.log(poriAdmin.id);
  const [poriAdminUserMetadata] = await queryInterface.sequelize.query(
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
        id: poriAdmin.id,
      },
    },
  );
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

  const [groupMember] = await queryInterface.sequelize.query(
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
          userId: poriAdmin.id,
          groupId: group.id,
        },
      },
    );
  }

  console.log('make poriAdmin user the group owner of all groups');
  await queryInterface.sequelize.query(
    'UPDATE user_groups SET owner_id = :owner',
    {transaction, replacements: {owner: poriAdmin.id}},
  );

};

const cleanDb = async () => {
  const queryInterface = sequelize.getQueryInterface();

  return queryInterface.sequelize.transaction(async (transaction) => {
    await addPoriAdminUser(queryInterface, transaction);
  });
};
cleanDb()
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });

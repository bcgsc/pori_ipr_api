const {addUniqueActiveFieldIndex} = require('../../migrationTools/index');

const USER_TABLE = 'users';
const USER_METADATA_TABLE = 'user_metadata';

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Remove all deleted user entries and create new user_metadata table
      await Promise.all([
        queryInterface.bulkDelete('users', {deleted_at: {[Sq.Op.ne]: null}}, {transaction}),
        queryInterface.createTable(USER_METADATA_TABLE, {
          id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          ident: {
            type: Sq.UUID,
            unique: false,
            defaultValue: Sq.UUIDV4,
            allowNull: false,
          },
          settings: {
            type: Sq.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          userId: {
            name: 'userId',
            field: 'user_id',
            type: Sq.INTEGER,
            references: {
              model: 'users',
              key: 'id',
            },
            allowNull: false,
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          createdAt: {
            type: Sq.DATE,
            defaultValue: Sq.NOW,
            name: 'createdAt',
            field: 'created_at',
          },
          updatedAt: {
            type: Sq.DATE,
            name: 'updatedAt',
            field: 'updated_at',
          },
          deletedAt: {
            type: Sq.DATE,
            name: 'deletedAt',
            field: 'deleted_at',
          },
        }, {transaction}),
      ]);

      // Add unique active fields constraint
      await addUniqueActiveFieldIndex(queryInterface, Sq, transaction, USER_METADATA_TABLE, ['ident']);

      // Create new user metadata entries for all users
      await queryInterface.sequelize.query(`
        INSERT INTO ${USER_METADATA_TABLE} (ident, settings, user_id, created_at, updated_at) 
          SELECT uuid_generate_v4(), settings, id, NOW(), NOW() 
            FROM ${USER_TABLE}`, {transaction});

      // Remove all unused columns from users
      return Promise.all([
        queryInterface.removeColumn(USER_TABLE, 'jiraToken', {transaction}),
        queryInterface.removeColumn(USER_TABLE, 'jiraXsrf', {transaction}),
        queryInterface.removeColumn(USER_TABLE, 'settings', {transaction}),
        queryInterface.removeColumn(USER_TABLE, 'lastLogin', {transaction}),
      ]);
    });
  },

  down: () => {
    throw new Error('Not implemented!');
  },
};

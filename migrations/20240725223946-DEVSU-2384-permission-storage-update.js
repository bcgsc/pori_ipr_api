const NEW_TABLE = 'user_groups';
const OLD_TABLE = 'user_groups_old';
const {DEFAULT_COLUMNS} = require('../app/models/base');

module.exports = {
  up: async (queryInterface, Sq) => {
    // Create new variant text table
    // return queryInterface.sequelize.transaction(async (transaction) => {
    queryInterface.renameTable(NEW_TABLE, OLD_TABLE);

    console.log('Creating new table');

    await queryInterface.createTable(NEW_TABLE, {
      ...DEFAULT_COLUMNS,
      user_id: {
        allowNull: false,
        name: 'userId',
        field: 'user_id',
        type: Sq.INTEGER,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      name: {
        type: Sq.ENUM(
          'admin',
          'manager',
          'report assignment access',
          'create report access',
          'germline access',
          'non-production access',
          'unreviewed access',
          'all projects access',
          'template edit access',
          'appendix edit access',
          'variant-text edit access',
        ),
        allowNull: false,
      },
    });

    await queryInterface.sequelize
      .query(
        `
        create function cast_to_text(enum_user_groups_group) returns text as
        $$ select $1::text; $$
        language sql cost 1 immutable;`,
      );

    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX groups_unique ON user_groups ((ARRAY[cast_to_text("group"), user_id::text])) where deleted_at is null;',
    );

    console.log('Migrating data');

    await queryInterface.sequelize.query(
      // eslint-disable-next-line no-multi-str
      `insert into user_groups
        (ident, created_at, updated_at, user_id, "group")
        select gen_random_uuid(), now(), now(), user_id, LOWER(ug.name)::enum_user_groups_group from user_group_members ugm 
          join user_groups_old ug on (ugm.group_id = ug.id)
          where ugm.deleted_at is null;`,
      {
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );

    await queryInterface.dropTable('user_group_members', {cascade: true});
    await queryInterface.dropTable(OLD_TABLE, {cascade: true});
    // });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
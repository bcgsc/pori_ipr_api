const camelCaseTables = [
  'germline_small_mutations', 'germline_small_mutations_review',
  'germline_small_mutations_variant', 'reports_mavis_summary', 'reports_presentation_discussion',
  'reports_presentation_slides', 'reports_probe_test_information',
  'reports_users', 'user_group_members', 'user_groups', 'user_projects',
];

const objectsToRemoveUniqueIdent = [
  {table: 'germline_small_mutations', constraint: 'pog_analysis_germline_small_mutations_ident_key'},
  {table: 'germline_small_mutations_review', constraint: 'pog_analysis_germline_small_mutations_review_ident_key'},
  {table: 'germline_small_mutations_variant', constraint: 'pog_analysis_germline_small_mutations_variant_ident_key'},
  {table: 'user_groups', constraint: 'userGroups_ident_key'},
  {table: 'reports_users', constraint: 'POGUsers_ident_key'},
];

const tablesToAddPartialUniqueIdent = [
  'germline_small_mutations', 'germline_small_mutations_review',
  'germline_small_mutations_variant', 'user_groups', 'reports_users',
  'reports_mavis_summary', 'reports_presentation_discussion',
  'reports_presentation_slides', 'reports_image_data',
  'reports_probe_test_information',
];

const tablesToDelete = ['notifications', 'pog_recent_reports', 'user_tokens'];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // delete unused tables
      await Promise.all(
        tablesToDelete.map((table) => {
          return queryInterface.dropTable(table, {transaction});
        }),
      );

      // remove unique ident from tables
      await Promise.all(
        objectsToRemoveUniqueIdent.map((entry) => {
          return queryInterface.removeConstraint(entry.table, entry.constraint, {transaction});
        }),
      );

      // change all tables to have snake case for timestampz columns createdAt, updated_at, etc..
      await Promise.all(
        camelCaseTables.map((table) => {
          return Promise.all([
            queryInterface.renameColumn(table, 'createdAt', 'created_at', {transaction}),
            queryInterface.renameColumn(table, 'updatedAt', 'updated_at', {transaction}),
            queryInterface.renameColumn(table, 'deletedAt', 'deleted_at', {transaction}),
          ]);
        }),
      );

      // add delete column and update camel case columns to snake case
      const missingDeletedAtColumnTable = 'reports_image_data';
      await Promise.all([
        queryInterface.renameColumn(missingDeletedAtColumnTable, 'createdAt', 'created_at', {transaction}),
        queryInterface.renameColumn(missingDeletedAtColumnTable, 'updatedAt', 'updated_at', {transaction}),
        queryInterface.addColumn(missingDeletedAtColumnTable, 'deleted_at', {type: Sequelize.DATE}, {transaction}),
      ]);

      // add delete and update column and update camel case columns to snake case
      const missingDelAndUpdColumnTable = 'flash_tokens';
      await Promise.all([
        queryInterface.renameColumn(missingDelAndUpdColumnTable, 'createdAt', 'created_at', {transaction}),
        queryInterface.addColumn(missingDelAndUpdColumnTable, 'updated_at', {type: Sequelize.DATE, defaultValue: Sequelize.NOW}, {transaction}),
        queryInterface.addColumn(missingDelAndUpdColumnTable, 'deleted_at', {type: Sequelize.DATE}, {transaction}),
      ]);

      // add partial unique index for tables missing it
      return Promise.all(
        tablesToAddPartialUniqueIdent.map((table) => {
          return queryInterface.addIndex(table, {
            name: `${table}_ident_index`,
            unique: true,
            fields: ['ident'],
            where: {
              deleted_at: {
                [Sequelize.Op.eq]: null,
              },
            },
            transaction,
          });
        }),
      );
    });
  },

  down: () => {
    throw new Error('Not Implemented');
  },
};

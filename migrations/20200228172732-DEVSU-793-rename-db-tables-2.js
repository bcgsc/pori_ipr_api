const camelCaseTables = ['germline_small_mutations', 'germline_small_mutations_review',
  'germline_small_mutations_variant', 'reports_mavis_summary', 'reports_presentation_discussion',
  'reports_presentation_slides', 'reports_probe_test_information',
  'reports_users', 'user_group_members', 'user_groups', 'user_projects',
];

const tablesToDelete = ['notifications', 'pog_recent_reports', 'user_tokens'];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.sequelize.transaction(async (transaction) => {
        // delete unused tables
        await Promise.all(
          tablesToDelete.map((table) => {
            return queryInterface.dropTable(table, {transaction});
          })
        );

        // change all tables to have snake case for timestampz columns createdAt, updated_at, etc..
        await Promise.all(
          camelCaseTables.map((table) => {
            return Promise.all([
              queryInterface.renameColumn(table, 'createdAt', 'created_at', {transaction}),
              queryInterface.renameColumn(table, 'updatedAt', 'updated_at', {transaction}),
              queryInterface.renameColumn(table, 'deletedAt', 'deleted_at', {transaction}),
            ]);
          })
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
        return Promise.all([
          queryInterface.renameColumn(missingDelAndUpdColumnTable, 'createdAt', 'created_at', {transaction}),
          queryInterface.addColumn(missingDelAndUpdColumnTable, 'updated_at', {type: Sequelize.DATE, defaultValue: Sequelize.NOW}, {transaction}),
          queryInterface.addColumn(missingDelAndUpdColumnTable, 'deleted_at', {type: Sequelize.DATE}, {transaction}),
        ]);
      });
    } catch (error) {
      throw error;
    }
  },

  down: () => {
    throw new Error('Not Implemented');
  },
};

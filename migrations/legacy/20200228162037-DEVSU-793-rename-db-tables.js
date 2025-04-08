module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // get all tables
      const [tables] = await queryInterface.sequelize.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema='public'
          AND table_type='BASE TABLE'`, {transaction});

      const promises = [];

      tables.forEach((table) => {
        const {table_name: tableName} = table;
        // table contains 'pog_analysis_'
        if (tableName.startsWith('pog_analysis_')) {
          promises.push(queryInterface.renameTable(tableName, tableName.replace('pog_analysis_', ''), {transaction}));
        } else {
          switch (tableName) {
            case 'pog_patient_information':
              promises.push(queryInterface.renameTable(tableName, 'reports_patient_information', {transaction}));
              break;
            case 'userGroupMembers':
              promises.push(queryInterface.renameTable(tableName, 'user_group_members', {transaction}));
              break;
            case 'userGroups':
              promises.push(queryInterface.renameTable(tableName, 'user_groups', {transaction}));
              break;
            case 'userTokens':
              promises.push(queryInterface.renameTable(tableName, 'user_tokens', {transaction}));
              break;
            default:
          }
        }
      });
      return Promise.all(promises);
    });
  },

  down: () => {
    throw new Error('Not implemented');
  },
};

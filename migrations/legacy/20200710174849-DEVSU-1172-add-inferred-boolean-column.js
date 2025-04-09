module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // 1) Add new column
      await queryInterface.addColumn('reports_kb_matches', 'inferred', Sequelize.BOOLEAN, {transaction});

      // 2) Copy data from old column to new column
      return queryInterface.sequelize.query(`
          UPDATE reports_kb_matches SET inferred = (kb_data ->> 'inferred')::boolean WHERE kb_data -> 'inferred' IS NOT NULL
        `, {transaction});
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

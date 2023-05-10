const TABLE = 'reports_tmbur_mutation_burden';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        TABLE,
        'kb_category',
         {
            name: 'kbCategory',
            field: 'kb_category',
            type: Sq.TEXT,
          },
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

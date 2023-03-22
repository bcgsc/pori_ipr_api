const REPORTS_TABLE = 'reports';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        REPORTS_TABLE,
        'oncotree_tumour_type',
        {type: Sq.TEXT,
          defaultValue: null},
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

const MSI = 'reports_msi';
const TMB = 'reports_tmbur_mutation_burden';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        MSI,
        'comments',
        {type: Sq.TEXT,
          defaultValue: null},
        {transaction},
      );
      await queryInterface.addColumn(
        TMB,
        'comments',
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

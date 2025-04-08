module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return queryInterface.changeColumn(
        'reports_somatic_mutations_mutation_signature',
        'signature',
        {
          type: Sequelize.TEXT,
        },
        {transaction},
      );
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

const TABLE = 'reports';

module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all([
        queryInterface.renameColumn(TABLE, 'intersect_tmb_score', 'genome_tmb', {transaction})
      ]);
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

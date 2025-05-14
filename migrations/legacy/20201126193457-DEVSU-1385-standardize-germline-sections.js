module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all([
        queryInterface.renameColumn('germline_small_mutations_variant', 'dbSNP', 'db_snp', {transaction}),
        queryInterface.renameColumn('germline_small_mutations_review', 'reviewedBy_id', 'reviewer_id', {transaction}),
      ]);
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

const TABLE = 'reports_genes';

module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all([
        queryInterface.renameColumn(TABLE, 'cancer_gene', 'cancer_gene_list_match', {transaction}),
        queryInterface.renameColumn(TABLE, 'cancer_related', 'kb_statement_related', {transaction}),
      ]);
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

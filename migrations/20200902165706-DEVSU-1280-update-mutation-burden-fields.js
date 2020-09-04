const MUTATION_BURDEN_TABLE = 'reports_mutation_burden';

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all([
        queryInterface.renameColumn(MUTATION_BURDEN_TABLE, 'snv', 'coding_snv_count', {transaction}),
        queryInterface.renameColumn(MUTATION_BURDEN_TABLE, 'snv_truncating', 'truncating_snv_count', {transaction}),
        queryInterface.renameColumn(MUTATION_BURDEN_TABLE, 'snv_percentile', 'coding_snv_percentile', {transaction}),
        queryInterface.renameColumn(MUTATION_BURDEN_TABLE, 'indels', 'coding_indels_count', {transaction}),
        queryInterface.renameColumn(MUTATION_BURDEN_TABLE, 'indel_percentile', 'coding_indel_percentile', {transaction}),
        queryInterface.renameColumn(MUTATION_BURDEN_TABLE, 'indels_frameshift', 'frameshift_indels_count', {transaction}),
        queryInterface.renameColumn(MUTATION_BURDEN_TABLE, 'sv', 'quality_sv_count', {transaction}),
        queryInterface.renameColumn(MUTATION_BURDEN_TABLE, 'sv_expressed', 'quality_sv_expressed_count', {transaction}),
        queryInterface.renameColumn(MUTATION_BURDEN_TABLE, 'sv_percentile', 'quality_sv_percentile', {transaction}),
        queryInterface.addColumn(MUTATION_BURDEN_TABLE, 'total_snv_count', Sq.INTEGER, {transaction}),
        queryInterface.addColumn(MUTATION_BURDEN_TABLE, 'total_indel_count', Sq.INTEGER, {transaction}),
        queryInterface.addColumn(MUTATION_BURDEN_TABLE, 'total_mutations_per_mb', Sq.FLOAT, {transaction}),
      ]);
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};

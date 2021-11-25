const TABLE = 'reports_small_mutations';

module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all(['normal', 'tumour', 'rna'].map(async (sampleType) => {
        return queryInterface.sequelize.query(
          `UPDATE ${TABLE} SET ${sampleType}_depth = ${sampleType}_alt_count + ${sampleType}_ref_count
          WHERE ${sampleType}_alt_count IS NOT NULL
            AND ${sampleType}_ref_count IS NOT NULL
            AND ${sampleType}_depth IS NULL`,
          {transaction},
        );
      }));
    });
  },

  down: () => {
    throw new Error('Not implemented!');
  },
};

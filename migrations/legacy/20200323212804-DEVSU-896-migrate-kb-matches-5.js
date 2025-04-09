/**
 * Change the exon column type (separate b/c very slow otherwise)
 */
const SV_TABLE = 'reports_structural_variants';
const KB_TABLE = 'reports_kb_matches';

module.exports = {
  up: async (queryInterface, Sq) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // now that all the variants have been linked, add the not null constraint and drop the original columns
      // Add not null constraint to tables
      console.log(`set not null constraint on ${KB_TABLE}.variant_id`);
      await queryInterface.changeColumn(
        KB_TABLE,
        'variant_id',
        {type: Sq.INTEGER, allowNull: false},
        {transaction},
      );
      const columnsToDrop = [
        'gene',
        'variant',
        'zygosity',
        'expression_tissue_fc',
        'expression_cancer_percentile',
        'copy_number',
        'loh_region',
      ];
      console.log(`drop columns (${columnsToDrop}) from ${KB_TABLE}`);
      await Promise.all(columnsToDrop.map((col) => {
        return queryInterface.removeColumn(KB_TABLE, col, {transaction});
      }));
      for (const col of ['exon1', 'exon2']) {
        console.log(`change column (${SV_TABLE}.${col}) type from TEXT to INTEGER`);
        await queryInterface.changeColumn(
          SV_TABLE,
          col,
          {type: `INTEGER USING ${col}::INTEGER`, allowNull: true, defaultValue: null},
        );
      }
      await transaction.commit();
    } catch (e) {
      // console.error(e);
      await transaction.rollback();
      throw e;
    }
  },

  down: () => {
    throw Error('not implemented');
  },
};

/**
 * Add the FK column gene_id to each of the variant tables
 */
const GENE_TABLE = 'reports_genes';
const SV_TABLE = 'reports_structural_variation_sv';
const GENE_LINKED_VARIANT_TABLES = [
  'reports_expression_outlier',
  'reports_copy_number_analysis_cnv',
  'reports_somatic_mutations_small_mutations',
  'reports_probe_results',
];

module.exports = {
  up: async (queryInterface, Sq) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('add the FK gene column to the variant tables');

      for (const table of GENE_LINKED_VARIANT_TABLES) {
        console.log(`Adding column ${table}.gene_id (FK)`);
        await queryInterface.addColumn(
          table,
          'gene_id',
          {
            type: Sq.INTEGER,
            references: {model: GENE_TABLE, key: 'id'},
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          {transaction},
        );
      }

      await queryInterface.addColumn(
        SV_TABLE,
        'gene1_id',
        {
          type: Sq.INTEGER,
          references: {model: GENE_TABLE, key: 'id'},
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        {transaction},
      );
      await queryInterface.addColumn(
        SV_TABLE,
        'gene2_id',
        {
          type: Sq.INTEGER,
          references: {model: GENE_TABLE, key: 'id'},
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        {transaction},
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: () => {
    throw Error('Not Implemented');
  },
};

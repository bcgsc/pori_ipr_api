const GENE_TABLE = 'reports_genes';
const SV_TABLE = 'reports_structural_variation_sv';

const {addUniqueActiveFieldIndex} = require('../../migrationTools');

module.exports = {
  up: async (queryInterface, Sq) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await addUniqueActiveFieldIndex(queryInterface, Sq, transaction, GENE_TABLE, ['report_id', 'name']);

      await addUniqueActiveFieldIndex(queryInterface, Sq, transaction, GENE_TABLE, ['ident']);

      console.log('transfer the content from the genes/exons to the split versions');
      await queryInterface.sequelize.query(
        `UPDATE ${SV_TABLE} SET
          gene1 = TRIM(split_part(genes, '::', 1)),
          gene2 = TRIM(split_part(genes, '::', 2)),
          exon1 = split_part(exons, ':', 1),
          exon2 = split_part(exons, ':', 2)`,
        {transaction},
      );

      console.log('remove the exons and genes columns');
      await queryInterface.removeColumn(SV_TABLE, 'genes', {transaction});
      await queryInterface.removeColumn(SV_TABLE, 'exons', {transaction});

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

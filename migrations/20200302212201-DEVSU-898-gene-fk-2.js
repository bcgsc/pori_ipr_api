const GENE_TABLE = 'reports_genes';
const SV_TABLE = 'pog_analysis_reports_structural_variation_sv';

module.exports = {
  up: async (queryInterface, Sq) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log(`add the unique report + gene index and the unique report + ident index to the ${GENE_TABLE} table`);
      queryInterface.addConstraint(GENE_TABLE, ['report_id', 'name'], {
        type: 'unique',
        where: {
          deleted_at: {
            [Sq.Op.eq]: null,
          },
        },
      });

      console.log('add the unique ident constraint');
      queryInterface.addConstraint(GENE_TABLE, ['ident'], {
        type: 'unique',
        where: {
          deleted_at: {
            [Sq.Op.eq]: null,
          },
        },
      });

      console.log('transfer the content from the genes/exons to the split versions');
      await queryInterface.sequelize.query(
        `UPDATE ${SV_TABLE} SET
          gene1 = split_part(genes, '::', 1),
          gene2 = split_part(genes, '::', 2),
          exon1 = split_part(exons, ':', 1),
          exon2 = split_part(exons, ':', 2)`,
        {transaction}
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

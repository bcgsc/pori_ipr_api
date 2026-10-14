const GENOMIC_ALTERATIONS_TABLE = 'reports_summary_genomic_alterations_identified';
const GENOMIC_ALTERATIONS_INDEX_NAME = `${GENOMIC_ALTERATIONS_TABLE}_report_id_gene_variant_germline_index`;

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // DEVSU-3029: Update unique index that was created in DEVSU-949 to also include variant type and variant id to allow alterations of similar properties but different associated variants to be created
      await queryInterface.removeIndex(
        GENOMIC_ALTERATIONS_TABLE,
        GENOMIC_ALTERATIONS_INDEX_NAME,
        { concurrently: true },
        { transaction },
      );

      await queryInterface.addIndex(GENOMIC_ALTERATIONS_TABLE, {
        name: GENOMIC_ALTERATIONS_INDEX_NAME,
        unique: true,
        concurrently: true,
        fields: ['report_id', 'geneVariant', 'germline', 'variant_type', 'variant_id'],
        where: {
          deleted_at: {
            [Sq.Op.eq]: null,
          },
        },
      }, { transaction });
    });
  },

  down: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        GENOMIC_ALTERATIONS_TABLE,
        GENOMIC_ALTERATIONS_INDEX_NAME,
        { transaction },
      );

      await queryInterface.addIndex(GENOMIC_ALTERATIONS_TABLE, {
        name: GENOMIC_ALTERATIONS_INDEX_NAME,
        unique: true,
        fields: ['report_id', 'geneVariant', 'germline'],
        where: {
          deleted_at: {
            [Sq.Op.eq]: null,
          },
        },
      }, { transaction });
    });
  },
};

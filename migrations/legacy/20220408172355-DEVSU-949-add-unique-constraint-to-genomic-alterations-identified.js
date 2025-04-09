const GENOMIC_ALTERATIONS_TABLE = 'reports_summary_genomic_alterations_identified';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.addIndex(GENOMIC_ALTERATIONS_TABLE, {
      name: `${GENOMIC_ALTERATIONS_TABLE}_report_id_gene_variant_germline_index`,
      unique: true,
      fields: ['report_id', 'geneVariant', 'germline'],
      where: {
        deleted_at: {
          [Sq.Op.eq]: null,
        },
      },
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};

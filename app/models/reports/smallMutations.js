const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  return sequelize.define('smallMutations', {
    ...DEFAULT_COLUMNS,
    reportId: {
      name: 'reportId',
      field: 'report_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports',
        key: 'id',
      },
    },
    geneId: {
      name: 'geneId',
      field: 'gene_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports_genes',
        key: 'id',
      },
      allowNull: false,
    },
    transcript: {
      type: Sq.TEXT,
    },
    proteinChange: {
      field: 'protein_change',
      name: 'proteinChange',
      type: Sq.TEXT,
    },
    location: {
      type: Sq.TEXT,
    },
    refAlt: {
      field: 'ref_alt',
      name: 'refAlt',
      type: Sq.TEXT,
    },
    zygosity: {
      type: Sq.TEXT,
    },
    tumourReads: {
      field: 'tumour_reads',
      name: 'tumourReads',
      type: Sq.TEXT,
    },
    rnaReads: {
      field: 'rna_reads',
      name: 'rnaReads',
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'reports_small_mutations',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt', 'geneId']},
        include: [
          {model: sequelize.models.genes, as: 'gene', attributes: ['ident', 'name']},
        ],
      },
    },
  });
};

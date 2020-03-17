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
    mutationType: {
      type: Sq.ENUM('clinical', 'nostic', 'biological', 'unknown'),
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
      type: Sq.TEXT,
    },
    location: {
      type: Sq.TEXT,
    },
    refAlt: {
      type: Sq.TEXT,
    },
    zygosity: {
      type: Sq.TEXT,
    },
    ploidyCorrCpChange: {
      type: Sq.TEXT,
    },
    lohState: {
      type: Sq.TEXT,
    },
    tumourReads: {
      type: Sq.TEXT,
    },
    RNAReads: {
      type: Sq.TEXT,
    },
    expressionRpkm: {
      type: Sq.FLOAT,
    },
    foldChange: {
      type: Sq.FLOAT,
    },
    TCGAPerc: {
      type: Sq.INTEGER,
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'reports_somatic_mutations_small_mutations',
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

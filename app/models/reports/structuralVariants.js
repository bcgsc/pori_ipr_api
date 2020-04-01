const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  return sequelize.define('structuralVariants', {
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
    mavis_product_id: {
      type: Sq.TEXT,
    },
    gene1Id: {
      name: 'gene1Id',
      field: 'gene1_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports_genes',
        key: 'id',
      },
    },
    gene2Id: {
      name: 'gene2Id',
      field: 'gene2_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports_genes',
        key: 'id',
      },
    },
    exon1: {
      type: Sq.TEXT,
    },
    exon2: {
      type: Sq.TEXT,
    },
    breakpoint: {
      type: Sq.TEXT,
    },
    eventType: {
      type: Sq.TEXT,
    },
    detectedIn: {
      type: Sq.TEXT,
    },
    conventionalName: {
      type: Sq.TEXT,
    },
    svg: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    svgTitle: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    name: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    frame: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    ctermGene: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    ntermGene: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    ctermTranscript: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    ntermTranscript: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    omicSupport: {
      type: Sq.BOOLEAN,
      field: 'omic_support',
      name: 'omicSupport',
      defaultValue: false,
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'reports_structural_variants',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt', 'gene1Id', 'gene2Id']},
        include: [
          {
            model: sequelize.models.genes.scope('minimal'),
            foreignKey: 'gene1Id',
            as: 'gene1',
          },
          {
            model: sequelize.models.genes.scope('minimal'),
            foreignKey: 'gene2Id',
            as: 'gene2',
          },
        ],
      },
    },
  });
};

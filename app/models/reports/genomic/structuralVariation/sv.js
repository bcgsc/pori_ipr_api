const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = sequelize => sequelize.define('sv', {
  ...DEFAULT_COLUMNS,
  pog_id: {
    type: Sq.INTEGER,
    references: {
      model: 'POGs',
      key: 'id',
    },
  },
  report_id: {
    type: Sq.INTEGER,
    references: {
      model: 'pog_analysis_reports',
      key: 'id',
    },
  },
  mavis_product_id: {
    type: Sq.TEXT,
  },
  svVariant: {
    type: Sq.ENUM('clinical', 'nostic', 'biological', 'fusionOmicSupport', 'uncharacterized'),
  },
  genes: {
    type: Sq.TEXT,
  },
  exons: {
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
  rpkm: {
    type: Sq.TEXT,
  },
  foldChange: {
    type: Sq.TEXT,
  },
  tcgaPerc: {
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
}, {
  ...DEFAULT_OPTIONS,
  // Table Name
  tableName: 'pog_analysis_reports_structural_variation_sv',
  scopes: {
    public: {
      attributes: {exclude: ['id', 'deletedAt', 'report_id', 'pog_id']},
    },
  },
});

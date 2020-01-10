const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = sequelize => sequelize.define('cnv', {
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
  cnvVariant: {
    type: Sq.ENUM('clinical', 'nostic', 'biological', 'commonAmplified', 'homodTumourSupress', 'highlyExpOncoGain', 'lowlyExpTSloss'),
  },
  gene: {
    type: Sq.TEXT,
  },
  ploidyCorrCpChange: {
    type: Sq.INTEGER,
  },
  lohState: {
    type: Sq.TEXT,
  },
  cnvState: {
    type: Sq.TEXT,
  },
  chromosomeBand: {
    type: Sq.TEXT,
  },
  start: {
    type: Sq.INTEGER,
  },
  end: {
    type: Sq.INTEGER,
  },
  size: {
    type: Sq.FLOAT,
  },
  expressionRpkm: {
    type: Sq.FLOAT,
  },
  foldChange: {
    type: Sq.FLOAT,
  },
  tcgaPerc: {
    type: Sq.FLOAT,
  },
}, {
  ...DEFAULT_OPTIONS,
  // Table Name
  tableName: 'pog_analysis_reports_copy_number_analysis_cnv',
  scopes: {
    public: {
      attributes: {exclude: ['id', 'deletedAt', 'report_id', 'pog_id']},
    },
  },
});

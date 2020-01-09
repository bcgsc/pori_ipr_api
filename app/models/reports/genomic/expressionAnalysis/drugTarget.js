const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = sequelize => sequelize.define('drugTarget', {
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
  gene: {
    type: Sq.TEXT,
  },
  copy: {
    type: Sq.INTEGER,
  },
  lohRegion: {
    type: Sq.TEXT,
  },
  foldChange: {
    type: Sq.FLOAT,
  },
  tcgaPerc: {
    type: Sq.INTEGER,
  },
  drugOptions: {
    type: Sq.TEXT,
  },
  kIQR: {
    type: Sq.TEXT,
  },
  kIQRColumn: {
    type: Sq.TEXT,
  },
  kIQRNormal: {
    type: Sq.TEXT,
  },
  kIQRNormalColumn: {
    type: Sq.TEXT,
  },
}, {
  ...DEFAULT_OPTIONS,
  // Table Name
  tableName: 'pog_analysis_reports_expression_drug_target',
  scopes: {
    public: {
      attributes: {exclude: ['id', 'deletedAt', 'report_id', 'pog_id']},
    },
  },
});

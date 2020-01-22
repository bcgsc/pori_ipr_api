const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = sequelize => sequelize.define('proteinExpression', {
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
  proteinType: {
    type: Sq.ENUM('clinical', 'nostic', 'biological', 'upreg_onco', 'downreg_tsg'),
  },
  gene: {
    type: Sq.STRING,
  },
  location: {
    type: Sq.STRING,
  },
  copyChange: {
    type: Sq.STRING,
  },
  lohState: {
    type: Sq.STRING,
  },
  cnvState: {
    type: Sq.STRING,
  },
  rnaReads: {
    type: Sq.STRING,
  },
  rpkm: {
    type: Sq.FLOAT,
  },
  foldChange: {
    type: Sq.FLOAT,
  },
  tcgaPerc: {
    type: Sq.INTEGER,
  },
  kIQR: {
    type: Sq.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
  tcgaQC: {
    type: Sq.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
  tcgaNormPerc: {
    type: Sq.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
  kIQRNormal: {
    type: Sq.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
  ptxPerc: {
    type: Sq.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
  ptxkIQR: {
    type: Sq.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
}, {
  ...DEFAULT_OPTIONS,
  // Table Name
  tableName: 'pog_analysis_reports_expression_protein',
  scopes: {
    public: {
      attributes: {exclude: ['id', 'deletedAt', 'report_id', 'pog_id']},
    },
  },
});

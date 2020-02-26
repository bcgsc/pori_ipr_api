const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = sequelize => sequelize.define('outlier', {
  ...DEFAULT_COLUMNS,
  report_id: {
    type: Sq.INTEGER,
    references: {
      model: 'pog_analysis_reports',
      key: 'id',
    },
  },
  expType: {
    type: Sq.TEXT,
    defaultValue: 'rna',
  },
  outlierType: {
    type: Sq.STRING,
  },
  gene: {
    type: Sq.TEXT,
  },
  location: {
    type: Sq.TEXT,
  },
  copyChange: {
    type: Sq.TEXT,
  },
  lohState: {
    type: Sq.TEXT,
  },
  cnvState: {
    type: Sq.TEXT,
  },
  rnaReads: {
    type: Sq.TEXT,
  },
  rpkm: {
    type: Sq.FLOAT,
  },
  foldChange: {
    type: Sq.FLOAT,
  },
  expression_class: {
    type: Sq.TEXT,
    defaultValue: null,
  },
  tcgaPerc: {
    type: Sq.INTEGER,
  },
  tcgaPercCol: {
    type: Sq.TEXT,
    defaultValue: null,
  },
  tcgakIQR: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  tcgaQC: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  tcgaQCCol: {
    type: Sq.TEXT,
    defaultValue: null,
  },
  tcgaAvgPerc: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  tcgaAvgkIQR: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  tcgaAvgQC: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  tcgaAvgQCCol: {
    type: Sq.TEXT,
    defaultValue: null,
  },
  tcgaNormPerc: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  tcgaNormkIQR: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  ptxPerc: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  ptxkIQR: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  ptxQC: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  ptxPercCol: {
    type: Sq.TEXT,
    defaultValue: null,
  },
  ptxTotSampObs: {
    type: Sq.INTEGER,
    defaultValue: null,
  },
  ptxPogPerc: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  gtexComp: {
    type: Sq.TEXT,
    defaultValue: null,
  },
  gtexPerc: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  gtexFC: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  gtexkIQR: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  gtexAvgPerc: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  gtexAvgFC: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  gtexAvgkIQR: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
}, {
  ...DEFAULT_OPTIONS,
  // Table Name
  tableName: 'pog_analysis_reports_expression_outlier',
  scopes: {
    public: {
      attributes: {exclude: ['id', 'deletedAt', 'report_id']},
    },
  },
});

const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = sequelize => sequelize.define('outlier', {
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
    allowNull: true,
    defaultValue: null,
  },
  tcgaPerc: {
    type: Sq.INTEGER,
  },
  tcgaPercCol: {
    type: Sq.TEXT,
    allowNull: true,
    defaultValue: null,
  },
  tcgakIQR: {
    type: Sq.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
  tcgaQC: {
    type: Sq.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
  tcgaQCCol: {
    type: Sq.TEXT,
    allowNull: true,
    defaultValue: null,
  },
  tcgaAvgPerc: {
    type: Sq.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
  tcgaAvgkIQR: {
    type: Sq.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
  tcgaAvgQC: {
    type: Sq.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
  tcgaAvgQCCol: {
    type: Sq.TEXT,
    allowNull: true,
    defaultValue: null,
  },
  tcgaNormPerc: {
    type: Sq.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
  tcgaNormkIQR: {
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
  ptxQC: {
    type: Sq.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
  ptxPercCol: {
    type: Sq.TEXT,
    allowNull: true,
    defaultValue: null,
  },
  ptxTotSampObs: {
    type: Sq.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  ptxPogPerc: {
    type: Sq.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
  gtexComp: {
    type: Sq.TEXT,
    allowNull: true,
    defaultValue: null,
  },
  gtexPerc: {
    type: Sq.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
  gtexFC: {
    type: Sq.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
  gtexkIQR: {
    type: Sq.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
  gtexAvgPerc: {
    type: Sq.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
  gtexAvgFC: {
    type: Sq.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
  gtexAvgkIQR: {
    type: Sq.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
}, {
  ...DEFAULT_OPTIONS,
  // Table Name
  tableName: 'pog_analysis_reports_expression_outlier',
  scopes: {
    public: {
      attributes: {exclude: ['id', 'deletedAt', 'report_id', 'pog_id']},
    },
  },
});

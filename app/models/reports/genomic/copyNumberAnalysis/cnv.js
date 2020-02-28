const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  return sequelize.define('cnv', {
    ...DEFAULT_COLUMNS,
    report_id: {
      type: Sq.INTEGER,
      references: {
        model: 'reports',
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
    tableName: 'reports_copy_number_analysis_cnv',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'report_id', 'deletedAt']},
      },
    },
  });
};

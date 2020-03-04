const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  return sequelize.define('drugTarget', {
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
      type: Sq.INTEGER,
      references: {
        model: 'reports_genes',
        key: 'id',
      },
      field: 'gene_id',
      name: 'geneId',
      allowNull: false,
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
    tableName: 'reports_expression_drug_target',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt']},
      },
    },
  });
};

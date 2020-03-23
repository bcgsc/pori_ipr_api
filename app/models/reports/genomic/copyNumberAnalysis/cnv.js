const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  return sequelize.define('cnv', {
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
      name: 'geneId',
      field: 'gene_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports_genes',
        key: 'id',
      },
      allowNull: false,
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
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'reports_copy_variants',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt', 'geneId']},
        include: [
          {
            model: sequelize.models.genes.scope('minimal'),
            as: 'gene',
          },
        ],
      },
      minimal: {
        attributes: ['cnvState', 'lohState', 'ploidyCorrCpChange'],
      },
    },
  });
};

const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

/**
 * Stores the results from the probing pipeline (targeted gene report) to be
 * displayed in the subsequent Genomic report (this report)
 */
module.exports = (sequelize) => {
  return sequelize.define('probeResults', {
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
    variant: {
      type: Sq.TEXT,
      allowNull: false,
    },
    sample: {
      type: Sq.TEXT,
      allowNull: false,
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'reports_probe_results',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'reportId', 'deletedAt'],
        },
      },
    },
  });
};

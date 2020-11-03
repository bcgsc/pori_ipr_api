const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  const expressionVariants = sequelize.define('expressionVariants', {
    ...DEFAULT_COLUMNS,
    reportId: {
      name: 'reportId',
      field: 'report_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports',
        key: 'id',
      },
      allowNull: false,
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
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
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    location: {
      type: Sq.TEXT,
    },
    rnaReads: {
      name: 'rnaReads',
      field: 'rna_reads',
      type: Sq.TEXT,
    },
    rpkm: {
      type: Sq.FLOAT,
    },
    tpm: {
      type: Sq.FLOAT,
      defaultValue: null,
    },
    expressionState: {
      name: 'expressionState',
      field: 'expression_state',
      type: Sq.TEXT,
      defaultValue: null,
    },
    diseasePercentile: {
      name: 'diseasePercentile',
      field: 'disease_percentile',
      type: Sq.FLOAT,
    },
    diseasekIQR: {
      name: 'diseasekIQR',
      field: 'disease_kiqr',
      type: Sq.FLOAT,
      defaultValue: null,
    },
    diseaseQC: {
      name: 'diseaseQC',
      field: 'disease_qc',
      type: Sq.FLOAT,
      defaultValue: null,
    },
    diseaseFoldChange: {
      name: 'diseaseFoldChange',
      field: 'disease_fold_change',
      type: Sq.FLOAT,
      defaultValue: null,
    },
    diseaseZScore: {
      name: 'diseaseZScore',
      field: 'disease_zscore',
      type: Sq.FLOAT,
      defaultValue: null,
    },
    primarySitePercentile: {
      name: 'primarySitePercentile',
      field: 'primary_site_percentile',
      type: Sq.FLOAT,
      defaultValue: null,
    },
    primarySitekIQR: {
      name: 'primarySitekIQR',
      field: 'primary_site_kiqr',
      type: Sq.FLOAT,
      defaultValue: null,
    },
    primarySiteQC: {
      name: 'primarySiteQC',
      field: 'primary_site_qc',
      type: Sq.FLOAT,
      defaultValue: null,
    },
    primarySiteFoldChange: {
      name: 'primarySiteFoldChange',
      field: 'primary_site_fold_change',
      type: Sq.FLOAT,
    },
    primarySiteZScore: {
      name: 'primarySiteZScore',
      field: 'primary_site_zscore',
      type: Sq.FLOAT,
    },
    biopsySitePercentile: {
      name: 'biopsySitePercentile',
      field: 'biopsy_site_percentile',
      type: Sq.FLOAT,
      defaultValue: null,
    },
    biopsySitekIQR: {
      name: 'biopsySitekIQR',
      field: 'biopsy_site_kiqr',
      type: Sq.FLOAT,
      defaultValue: null,
    },
    biopsySiteQC: {
      name: 'biopsySiteQC',
      field: 'biopsy_site_qc',
      type: Sq.FLOAT,
      defaultValue: null,
    },
    biopsySiteFoldChange: {
      name: 'biopsySiteFoldChange',
      field: 'biopsy_site_fold_change',
      type: Sq.FLOAT,
      defaultValue: null,
    },
    biopsySiteZScore: {
      name: 'biopsySiteZScore',
      field: 'biopsy_site_zscore',
      type: Sq.FLOAT,
      defaultValue: null,
    },
    kbCategory: {
      name: 'kbCategory',
      field: 'kb_category',
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_expression_variants',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'geneId', 'deletedAt']},
        include: [
          {model: sequelize.models.genes.scope('minimal'), as: 'gene'},
        ],
      },
      minimal: {
        attributes: [
          'expressionState', 'rpkm', 'diseasePercentile', 'primarySiteFoldChange',
        ],
      },
    },
  });

  // set instance methods
  expressionVariants.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, reportId, geneId, deletedAt, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return expressionVariants;
};

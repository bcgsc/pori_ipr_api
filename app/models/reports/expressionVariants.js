const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
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
    internalPancancerPercentile: {
      name: 'internalPancancerPercentile',
      field: 'internal_pancancer_percentile',
      type: Sq.FLOAT,
      defaultValue: null,
    },
    internalPancancerkIQR: {
      name: 'internalPancancerkIQR',
      field: 'internal_pancancer_kiqr',
      type: Sq.FLOAT,
      defaultValue: null,
    },
    internalPancancerQC: {
      name: 'internalPancancerQC',
      field: 'internal_pancancer_qc',
      type: Sq.FLOAT,
      defaultValue: null,
    },
    internalPancancerFoldChange: {
      name: 'internalPancancerFoldChange',
      field: 'internal_pancancer_fold_change',
      type: Sq.FLOAT,
      defaultValue: null,
    },
    internalPancancerZScore: {
      name: 'internalPancancerZScore',
      field: 'internal_pancancer_zscore',
      type: Sq.FLOAT,
      defaultValue: null,
    },
    kbCategory: {
      name: 'kbCategory',
      field: 'kb_category',
      type: Sq.TEXT,
    },
    germline: {
      type: Sq.BOOLEAN,
    },
    library: {
      type: Sq.TEXT,
    },
    comments: {
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_expression_variants',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'geneId', 'deletedAt', 'updatedBy']},
        include: [
          {model: sequelize.models.genes.scope('minimal'), as: 'gene'},
        ],
      },
      minimal: {
        attributes: [
          'expressionState', 'rpkm', 'diseasePercentile', 'primarySiteFoldChange',
          'tpm', 'primarySitekIQR', 'diseasekIQR',
        ],
      },
    },
  });

  // set instance methods
  expressionVariants.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, reportId, geneId, deletedAt, updatedBy, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return expressionVariants;
};

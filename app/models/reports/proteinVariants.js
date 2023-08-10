const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const proteinVariants = sequelize.define('proteinVariants', {
    ...DEFAULT_COLUMNS,
    reportId: {
      name: 'reportId',
      field: 'report_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      allowNull: false,
    },
    geneId: {
      name: 'geneId',
      field: 'gene_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports_genes',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      allowNull: false,
    },
    percentile: {
      type: Sq.FLOAT,
      defaultValue: null,
    },
    kiqr: {
      type: Sq.FLOAT,
      defaultValue: null,
    },
    qc: {
      type: Sq.FLOAT,
      defaultValue: null,
    },
    comparator: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    totalSampleObserved: {
      name: 'totalSampleObserved',
      field: 'total_sample_observed',
      type: Sq.INTEGER,
      defaultValue: null,
    },
    secondaryPercentile: {
      name: 'secondaryPercentile',
      field: 'secondary_percentile',
      type: Sq.FLOAT,
      defaultValue: null,
    },
    secondaryComparator: {
      name: 'secondaryComparator',
      field: 'secondary_comparator',
      type: Sq.TEXT,
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
    displayName: {
      name: 'displayName',
      field: 'display_name',
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_protein_variants',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'geneId', 'deletedAt', 'updatedBy']},
        include: [
          {model: sequelize.models.genes.scope('minimal'), as: 'gene'},
        ],
      },
    },
  });

  // set instance methods
  proteinVariants.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, reportId, geneId, deletedAt, updatedBy, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return proteinVariants;
};

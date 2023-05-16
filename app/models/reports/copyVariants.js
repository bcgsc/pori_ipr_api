const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const copyVariants = sequelize.define('copyVariants', {
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
    copyChange: {
      name: 'copyChange',
      field: 'copy_change',
      type: Sq.INTEGER,
    },
    lohState: {
      name: 'lohState',
      field: 'loh_state',
      type: Sq.TEXT,
    },
    cnvState: {
      name: 'cnvState',
      field: 'cnv_state',
      type: Sq.TEXT,
    },
    chromosomeBand: {
      name: 'chromosomeBand',
      field: 'chromosome_band',
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
    kbCategory: {
      name: 'kbCategory',
      field: 'kb_category',
      type: Sq.TEXT,
    },
    log2Cna: {
      name: 'log2Cna',
      field: 'log2_cna',
      type: Sq.NUMERIC,
    },
    cna: {
      type: Sq.NUMERIC,
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
    tableName: 'reports_copy_variants',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'geneId', 'deletedAt', 'updatedBy']},
        include: [
          {
            model: sequelize.models.genes.scope('minimal'),
            as: 'gene',
          },
        ],
      },
      minimal: {
        attributes: ['cnvState', 'lohState', 'copyChange'],
      },
    },
  });

  // set instance methods
  copyVariants.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, reportId, geneId, deletedAt, updatedBy, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return copyVariants;
};

const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const probeResults = sequelize.define('probeResults', {
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
    comments: {
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_probe_results',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'geneId', 'deletedAt']},
        include: [
          {model: sequelize.models.genes.scope('minimal'), as: 'gene'},
        ],
      },
    },
  });

  // set instance methods
  probeResults.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, geneId, deletedAt, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return probeResults;
};

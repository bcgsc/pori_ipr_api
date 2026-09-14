const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../../../base');

module.exports = (sequelize, Sq) => {
  const pathwayAnalysis = sequelize.define('pathwayAnalysis', {
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
    legendId: {
      name: 'legendId',
      field: 'legend_id',
      type: Sq.INTEGER,
      references: {
        model: 'pathway_analysis_legends',
        key: 'id',
      },
    },
    pathway: {
      type: Sq.TEXT,
      allowNull: true,
      jsonSchema: {
        description: 'SVG image of pathway',
        schema: {format: 'svg', type: 'string'},
      },
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_summary_pathway_analysis',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'reportId', 'deletedAt', 'updatedBy'],
        },
      },
    },
  });

  // set instance methods
  pathwayAnalysis.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, deletedAt, updatedBy, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return pathwayAnalysis;
};

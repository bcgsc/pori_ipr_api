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
    pathway: {
      type: Sq.TEXT,
      allowNull: true,
      jsonSchema: {
        description: 'SVG image of pathway',
        schema: {format: 'svg', type: 'string'},
      },
    },
    legend: {
      type: Sq.ENUM(['v1', 'v2', 'v3', 'custom']),
      allowNull: false,
      defaultValue: 'v3',
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

const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  const mavis = sequelize.define('mavis', {
    ...DEFAULT_COLUMNS,
    product_id: {
      type: Sq.TEXT,
      allowNull: false,
    },
    reportId: {
      name: 'reportId',
      field: 'report_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports',
        key: 'id',
      },
    },
    summary: {
      type: Sq.JSONB,
      allowNull: false,
      defaultValue: {},
      jsonSchema: {
        schema: {
          type: 'string',
          example: '{"#tracking_id": "upload test tracking id", "library": "upload test library"}',
        },
      },
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_mavis_summary',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'product_id', 'deletedAt']},
      },
    },
  });

  // set instance methods
  mavis.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, product_id, deletedAt, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return mavis;
};

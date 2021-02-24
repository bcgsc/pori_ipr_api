const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const immuneCellTypes = sequelize.define('immuneCellTypes', {
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
    cellType: {
      name: 'cellType',
      field: 'cell_type',
      type: Sq.TEXT,
      allowNull: false,
    },
    kbCategory: {
      name: 'kbCategory',
      field: 'kb_category',
      type: Sq.TEXT,
    },
    score: {
      type: Sq.FLOAT,
    },
    percentile: {
      type: Sq.FLOAT,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_immune_cell_types',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt']},
      },
    },
  });

  // set instance methods
  immuneCellTypes.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, reportId, deletedAt, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return immuneCellTypes;
};
